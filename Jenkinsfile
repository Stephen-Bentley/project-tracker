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
            defaultValue: '.env.production',
            description: 'Path to the production environment file on the deployment host.'
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
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    set -eu
                    npm ci
                    npm run format:check
                    npm run build
                    npm test --prefix backend -- --runInBand
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
                branch 'main'
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
                branch 'main'
            }
            steps {
                sh '''
                    set -eu
                    test -f "${DEPLOY_ENV_FILE}"
                    IMAGE_TAG="${IMAGE_TAG}" docker compose --env-file "${DEPLOY_ENV_FILE}" up -d --build --remove-orphans
                    FRONTEND_HOST_PORT=$(grep '^FRONTEND_HOST_PORT=' "${DEPLOY_ENV_FILE}" | cut -d= -f2- || echo 7448)
                    curl --fail --retry 12 --retry-delay 5 "http://localhost:${FRONTEND_HOST_PORT}/"
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
