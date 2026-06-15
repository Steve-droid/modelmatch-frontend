// modelmatch-frontend CI/CD pipeline (P17 — the first real product pipeline).
//
// Runs on the graded persistent Jenkins controller as a MULTIBRANCH job. Every branch
// runs the full validation flow (build + 3 test types + security gates); only `main`
// runs the release tail (tag -> publish -> deploy).
//
//   Source -> Build -> Static/dep gate (eslint + tsc; npm audit report-only)
//     -> Test (Vitest unit/component) -> Package (build the FE image)
//     -> Trivy image scan (gate CRITICAL + HIGH; .trivyignore for documented waivers)
//     -> Integration (Vitest + RTL + MSW, no containers)
//     -> E2E (Playwright vs a THROWAWAY compose stack FE-image+BE+Postgres,
//             empty volume -> migrate+seed -> down -v; fake-LLM only, no e2e-live)
//     -> [main only] Tag (annotated SemVer) -> Publish (ECR) -> Deploy (gitops bump)
//
// Identities (NO static AWS keys; creds referenced by ID only):
//   * EC2 instance role  modelmatch-jenkins-role  -> ECR login/push.
//   * frontend-deploy-key (WRITE) -> push the annotated git tag (release tail only).
//   * gitops-deploy-key   (WRITE) -> commit the image-tag bump (ArgoCD then syncs).
// Stable non-secret delivery config (registry/repo/tool image digests/targets/cred IDs)
// lives in ci/pipeline.env (loaded + validated below), NOT hardcoded here. Node/
// Playwright/Trivy/yq all run as pinned throwaway containers (the box has Docker, not a
// Node toolchain) — `sh`/`docker` over plugins, per the controller plan.

// Make an id safe for docker tags AND compose project names: lowercase, decode %2F, map
// every other unsafe char to '-', collapse repeats, trim, and bound the length.
def sanitizeId(String s) {
  String out = s.toLowerCase().replace('%2f', '-')
  out = out.replaceAll('[^a-z0-9_-]', '-').replaceAll('-+', '-')
  out = out.replaceAll('^[-_]+', '').replaceAll('[-_]+$', '')
  return out
}

// Run an npm/node command inside the pinned Node container with the Jenkins workspace
// mounted, so node_modules from `npm ci` (Build) persists across the JS stages. Runs as
// the Jenkins uid so files stay cleanable; HOME/npm cache point at /tmp.
def runNode(String cmd) {
  sh """
    docker run --rm \\
      -u \$(id -u):\$(id -g) \\
      -e HOME=/tmp -e npm_config_cache=/tmp/.npm \\
      -v "\$WORKSPACE":/work -w /work \\
      "\$NODE_IMAGE" \\
      bash -lc '${cmd}'
  """
}

pipeline {
  agent any

  options {
    // E2E brings up a compose stack and the release tail pushes a git tag — serialize
    // builds of this branch so neither races itself. (Cross-branch isolation comes from
    // the globally-unique RUN_ID below.)
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Source + config') {
      steps {
        checkout scm // Multibranch provides the FE read deploy key for the checkout
        script {
          // Load stable non-secret CI config from the repo and fail fast if incomplete.
          def required = [
            'AWS_DEFAULT_REGION', 'ECR_REGISTRY', 'ECR_REPO',
            'E2E_BACKEND_REPO', 'E2E_BACKEND_TAG',
            'NODE_IMAGE', 'PLAYWRIGHT_IMAGE', 'TRIVY_IMAGE', 'YQ_IMAGE',
            'FE_REPO_SSH', 'GITOPS_REPO', 'GITOPS_VALUES',
            'CRED_FE_DEPLOY_KEY', 'CRED_GITOPS_KEY',
          ]
          readFile('ci/pipeline.env').split('\n').each { line ->
            String t = line.trim()
            if (!t || t.startsWith('#')) return
            int i = t.indexOf('=')
            if (i > 0) { env[t.substring(0, i).trim()] = t.substring(i + 1).trim() }
          }
          def missing = required.findAll { !env[it] }
          if (missing) { error "ci/pipeline.env missing required keys: ${missing.join(', ')}" }

          // Globally-unique run id (BUILD_NUMBER is per-BRANCH, not global in Multibranch).
          // The unique suffix (build # + short SHA) is always preserved; only the job-name
          // prefix is bounded.
          String job = sanitizeId(env.JOB_NAME)
          if (job.length() > 50) { job = job.substring(0, 50).replaceAll('[-_]+$', '') }
          String sha = (env.GIT_COMMIT ?: 'nogit').take(7)
          env.RUN_ID = "${job}-${env.BUILD_NUMBER}-${sha}"
          env.IMAGE_CANDIDATE = "candidate-${env.RUN_ID}"

          sh 'git --no-pager log -1 --oneline; echo "Branch: ${BRANCH_NAME}  RunId: ${RUN_ID}"'
        }
      }
    }

    stage('Build') {
      // npm ci here populates node_modules in the workspace for every later JS stage.
      steps { runNode('npm ci && npm run build') }
    }

    stage('Static/dep gate') {
      steps {
        runNode('npm run lint')      // ESLint — hard gate
        runNode('npm run typecheck') // tsc --noEmit — hard gate
        // npm audit is REPORT-ONLY this slice (noisy transitive advisories); Trivy is the
        // hard dependency/image gate.
        runNode('npm audit || true')
      }
    }

    stage('Test (unit/component)') {
      steps { runNode('npm test') }
    }

    stage('Package') {
      // Build the real artifact: the FE image. Tagged with the per-build candidate tag;
      // only promoted to a published SemVer tag in the main release tail.
      steps {
        sh 'docker build -t "$ECR_REGISTRY/$ECR_REPO:$IMAGE_CANDIDATE" .'
      }
    }

    stage('Trivy image scan') {
      // Gate on CRITICAL + HIGH. Documented waivers only, via the committed .trivyignore
      // (currently empty — the Dockerfile pins a clean digest-pinned base, no waivers).
      steps {
        sh '''
          set -eu
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$WORKSPACE/.trivyignore":/.trivyignore:ro \
            "$TRIVY_IMAGE" image \
              --scanners vuln \
              --severity CRITICAL,HIGH \
              --ignorefile /.trivyignore \
              --exit-code 1 \
              --no-progress \
              "$ECR_REGISTRY/$ECR_REPO:$IMAGE_CANDIDATE"
        '''
      }
    }

    stage('Integration (Vitest+RTL+MSW)') {
      // Network-level tests against MSW — no containers.
      steps { runNode('npm run test:integration') }
    }

    stage('E2E (throwaway compose)') {
      // Drive the REAL FE image (nginx) wired to the backend + Postgres from a throwaway
      // compose stack: empty volume -> migrate+seed -> Playwright -> down -v. Fake-LLM
      // only (the compose backend defaults LLM_CLIENT=fake) — never e2e-live.
      steps {
        script {
          // Allocate two FREE host ports at runtime (not derived from BUILD_NUMBER, which
          // is only per-branch in Multibranch and would collide across branches). The URLs
          // below are keyed to the backend's actual port; the compose project name + image
          // tag are already RUN_ID-unique.
          def ports = sh(script: './ci/free-ports.sh 2', returnStdout: true).trim().split(/\s+/)
          String fePort = ports[0]
          String bePort = ports[1]
          String jwt = sh(script: 'openssl rand -hex 32', returnStdout: true).trim()

          withEnv([
            "COMPOSE_PROJECT_NAME=mm-e2e-${env.RUN_ID}",
            "FRONTEND_IMAGE=${env.ECR_REGISTRY}/${env.ECR_REPO}:${env.IMAGE_CANDIDATE}",
            "BACKEND_IMAGE=${env.ECR_REGISTRY}/${env.E2E_BACKEND_REPO}:${env.E2E_BACKEND_TAG}",
            "JWT_SECRET=${jwt}",
            "FRONTEND_PORT=${fePort}",
            "BACKEND_PORT=${bePort}",
            "API_BASE_URL=http://localhost:${bePort}",    // SPA -> backend (browser-facing)
            "PUBLIC_BASE_URL=http://localhost:${bePort}", // ci-setup / ingest URL
            "CORS_ALLOW_ORIGINS=http://localhost:${fePort}",
          ]) {
            // ECR login so compose can pull the pinned backend image (instance role).
            sh '''
              set -eu
              aws ecr get-login-password --region "$AWS_DEFAULT_REGION" \
                | docker login --username AWS --password-stdin "$ECR_REGISTRY"
            '''
            sh './ci/e2e-stack.sh up'
            // Playwright in its pinned image, sharing the host network so localhost:<port>
            // reaches the published compose ports; reuses the workspace node_modules.
            // E2E_REQUIRE_BACKEND makes an unreachable/unseeded backend FAIL, not skip.
            sh '''
              set -eu
              docker run --rm --network host \
                -u "$(id -u):$(id -g)" -e HOME=/tmp \
                -e E2E_REQUIRE_BACKEND=true \
                -e E2E_BASE_URL="http://localhost:${FRONTEND_PORT}" \
                -e E2E_API_BASE="http://localhost:${BACKEND_PORT}" \
                -v "$WORKSPACE":/work -w /work \
                "$PLAYWRIGHT_IMAGE" \
                npx playwright test --config playwright.config.e2e.ts
            '''
          }
        }
      }
      post {
        always {
          // Always down -v (drop the volume) even on failure.
          sh 'COMPOSE_PROJECT_NAME=mm-e2e-${RUN_ID} ./ci/e2e-stack.sh down || true'
        }
      }
    }

    // ------------------------- release tail (main only) -------------------------

    stage('Tag (main)') {
      when { branch 'main' }
      // Compute the next SemVer from git tags and create an ANNOTATED tag on the current
      // main commit. Idempotent: already tagged on this commit -> reuse; the computed tag
      // exists on a DIFFERENT commit -> fail. Uses the FE WRITE deploy key only here.
      steps {
        withCredentials([sshUserPrivateKey(credentialsId: env.CRED_FE_DEPLOY_KEY,
                                           keyFileVariable: 'FE_KEY',
                                           usernameVariable: 'FE_USER')]) {
          script {
            env.RELEASE_VERSION = sh(returnStdout: true, script: '''
              set -eu
              export GIT_SSH_COMMAND="ssh -i $FE_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
              git remote set-url origin "$FE_REPO_SSH"
              git fetch --tags --force origin >/dev/null 2>&1
              HEAD_SHA=$(git rev-parse HEAD^{commit})

              # already tagged on THIS commit -> idempotent reuse, no new tag
              EXISTING=$(git tag --points-at HEAD | grep -E "^v[0-9]+\\.[0-9]+\\.[0-9]+$" | sort -V | tail -1 || true)
              if [ -n "$EXISTING" ]; then
                echo "idempotent: HEAD already tagged $EXISTING" >&2
                printf "%s" "${EXISTING#v}"; exit 0
              fi

              # next = bump patch of the highest existing vX.Y.Z (or v0.0.1 if none)
              LATEST=$(git tag -l "v*" | grep -E "^v[0-9]+\\.[0-9]+\\.[0-9]+$" | sort -V | tail -1 || true)
              if [ -z "$LATEST" ]; then
                NEXT="v0.0.1"
              else
                MJ=$(echo "$LATEST" | sed -E "s/^v([0-9]+)\\.([0-9]+)\\.([0-9]+)$/\\1/")
                MI=$(echo "$LATEST" | sed -E "s/^v([0-9]+)\\.([0-9]+)\\.([0-9]+)$/\\2/")
                PA=$(echo "$LATEST" | sed -E "s/^v([0-9]+)\\.([0-9]+)\\.([0-9]+)$/\\3/")
                NEXT="v${MJ}.${MI}.$((PA + 1))"
              fi

              # guard: NEXT must not already exist on a DIFFERENT commit
              if git rev-parse -q --verify "refs/tags/${NEXT}" >/dev/null 2>&1; then
                TAGGED=$(git rev-list -n 1 "${NEXT}")
                if [ "$TAGGED" != "$HEAD_SHA" ]; then
                  echo "FAIL: ${NEXT} already exists on ${TAGGED}, not ${HEAD_SHA}" >&2
                  exit 1
                fi
                echo "idempotent: ${NEXT} already on HEAD" >&2
                printf "%s" "${NEXT#v}"; exit 0
              fi

              git config user.email "jenkins@modelmatch.ci"
              git config user.name  "modelmatch-jenkins"
              git tag -a "$NEXT" -m "release: $NEXT (build ${BUILD_NUMBER})" "$HEAD_SHA"
              git push origin "refs/tags/${NEXT}" >/dev/null 2>&1
              echo "created annotated tag $NEXT on $HEAD_SHA" >&2
              printf "%s" "${NEXT#v}"
            ''').trim()
            echo "Release version: ${env.RELEASE_VERSION}"
            currentBuild.displayName = "#${env.BUILD_NUMBER} v${env.RELEASE_VERSION}"
          }
        }
      }
    }

    stage('Publish (ECR, main)') {
      when { branch 'main' }
      // Promote the scanned candidate image to the published SemVer tag (instance role).
      steps {
        sh '''
          set -eu
          aws ecr get-login-password --region "$AWS_DEFAULT_REGION" \
            | docker login --username AWS --password-stdin "$ECR_REGISTRY"
          docker tag  "$ECR_REGISTRY/$ECR_REPO:$IMAGE_CANDIDATE" "$ECR_REGISTRY/$ECR_REPO:$RELEASE_VERSION"
          docker push "$ECR_REGISTRY/$ECR_REPO:$RELEASE_VERSION"
          echo "Published $ECR_REPO:$RELEASE_VERSION"
        '''
      }
    }

    stage('Deploy (gitops bump, main)') {
      when { branch 'main' }
      // The ONLY deploy action: bump frontend.image.tag in the gitops umbrella and push.
      // ArgoCD syncs from there (when a cluster is up). Never a hand kubectl/helm.
      steps {
        withCredentials([sshUserPrivateKey(credentialsId: env.CRED_GITOPS_KEY,
                                           keyFileVariable: 'GITOPS_KEY',
                                           usernameVariable: 'GITOPS_USER')]) {
          sh '''
            set -eu
            export GIT_SSH_COMMAND="ssh -i $GITOPS_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
            rm -rf gitops-deploy
            git clone "$GITOPS_REPO" gitops-deploy
            cd gitops-deploy
            docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/w -w /w "$YQ_IMAGE" \
              eval -i ".frontend.image.tag = \\"$RELEASE_VERSION\\"" "$GITOPS_VALUES"
            if git diff --quiet -- "$GITOPS_VALUES"; then
              echo "gitops already at frontend.image.tag=$RELEASE_VERSION — nothing to commit"
            else
              git config user.email "jenkins@modelmatch.ci"
              git config user.name  "modelmatch-jenkins"
              git add "$GITOPS_VALUES"
              git commit -m "deploy(frontend): image tag -> $RELEASE_VERSION (build ${BUILD_NUMBER})"
              git push origin HEAD:main
              echo "Bumped gitops frontend.image.tag -> $RELEASE_VERSION"
            fi
          '''
        }
      }
    }
  }

  post {
    always {
      // Free the per-build candidate image so the persistent box doesn't accumulate layers.
      sh 'docker image rm -f "$ECR_REGISTRY/$ECR_REPO:$IMAGE_CANDIDATE" || true'
    }
    success { echo "P17 pipeline GREEN on ${env.BRANCH_NAME}" }
  }
}
