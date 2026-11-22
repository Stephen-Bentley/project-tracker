pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 1, unit: 'HOURS')
    }

    parameters {
        string(
            name: 'DEPLOY_ENV_FILE',
            defaultValue: '/var/jenkins_home/secrets/project-tracker/.env.production',
            description: 'Path to the production environment file mounted into Jenkins.'
        )
        booleanParam(
            name: 'AUTO_DEPLOY',
            defaultValue: false,
            description: 'Deploy automatically after verification.'
        )
    }

    environment {
        IMAGE_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
    }

    stages {
        stage('Verify') {
            steps {
                sh '''
                    set -eu
                    docker run --rm \
                        --volumes-from "${HOSTNAME}" \
                        --workdir "${WORKSPACE}" \
                        node:20 \
                        sh -c 'npm ci && npm ci --prefix backend && npm ci --prefix frontend && npm run format:check && npm run build && npm test --prefix backend -- --runInBand'
                '''
            }
        }

        stage('Build Docker images') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env.example build
                '''
            }
        }

        stage('Approve deployment') {
            when {
                expression {
                    def branchName = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return !branchName || branchName == 'dockerize-jenkins' || branchName.endsWith('/dockerize-jenkins')
                }
            }
            steps {
                script {
                    if (!params.AUTO_DEPLOY) {
                        input message: 'Deploy the verified Project Tracker stack?', ok: 'Deploy', submitter: 'admin'
                    }
                }
            }
        }

        stage('Deploy') {
            when {
                expression {
                    def branchName = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return !branchName || branchName == 'dockerize-jenkins' || branchName.endsWith('/dockerize-jenkins')
                }
            }
            steps {
                sh '''
                    set -eu
                    test -f "${DEPLOY_ENV_FILE}"
                    IMAGE_TAG="${IMAGE_TAG}" docker compose --env-file "${DEPLOY_ENV_FILE}" up -d --build --remove-orphans

                    FRONTEND_CONTAINER=$(docker compose --env-file "${DEPLOY_ENV_FILE}" ps -q frontend)
                    test -n "${FRONTEND_CONTAINER}"

                    attempt=1
                    while [ "${attempt}" -le 12 ]; do
                        FRONTEND_STATUS=$(docker inspect --format '{{.State.Health.Status}}' "${FRONTEND_CONTAINER}" 2>/dev/null || true)
                        if [ "${FRONTEND_STATUS}" = 'healthy' ]; then
                            exit 0
                        fi
                        sleep 5
                        attempt=$((attempt + 1))
                    done

                    docker compose --env-file "${DEPLOY_ENV_FILE}" ps
                    docker compose --env-file "${DEPLOY_ENV_FILE}" logs --tail=100 frontend backend mongodb
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Project Tracker pipeline completed successfully.'
        }
        failure {
            echo 'Project Tracker pipeline failed. Existing containers were not removed automatically.'
        }
    }
}
