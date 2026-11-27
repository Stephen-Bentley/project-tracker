pipeline {
    agent { label 'built-in' }

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 1, unit: 'HOURS')
    }

    parameters {
        string(
            name: 'DEPLOY_ENV_FILE',
            defaultValue: '/var/jenkins_home/secrets/project-tracker/.env.postgres-production',
            description: 'Path to the PostgreSQL production environment file inside Jenkins.'
        )
        booleanParam(name: 'AUTO_DEPLOY', defaultValue: false, description: 'Deploy automatically after verification.')
    }

    environment {
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Verify') {
            steps {
                sh '''
                    docker run --rm --volumes-from Jenkins --workdir "$WORKSPACE" \
                        node:22-bookworm sh -ec '
                            npm ci &&
                            npm ci --prefix backend &&
                            npm ci --prefix frontend &&
                            npm exec -- prettier --check docker-compose.yml &&
                            npm run build &&
                            JWT_SECRET=jenkins-unit-test-only npm test --prefix backend -- --runInBand --config jest.postgres-unit.config.cjs
                        '
                '''
            }
        }

        stage('Build images on homeserver') {
            steps {
                sh 'docker compose --project-name project-tracker --env-file .env.example build'
            }
        }

        stage('Approve deployment') {
            when {
                expression { !params.AUTO_DEPLOY }
            }
            steps {
                input message: 'Deploy Project Tracker to Docker on the homeserver?', ok: 'Deploy', submitter: 'admin'
            }
        }

        stage('Deploy to homeserver') {
            steps {
                sh '''
                    set -eu
                    if [ ! -r "$DEPLOY_ENV_FILE" ]; then
                        echo "Missing deployment settings: $DEPLOY_ENV_FILE" >&2
                        exit 1
                    fi

                    docker compose --project-name project-tracker --env-file "$DEPLOY_ENV_FILE" \
                        up -d --no-build --wait --wait-timeout 180
                '''
            }
        }
    }
}
