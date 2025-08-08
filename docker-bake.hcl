variable "DEFAULT_TAG" {
    default = "realtime-ai-dungeon-master:latest"
}

// Special target for metadata
target "docker-metadata-action" {
    tags = ["${DEFAULT_TAG}"]
}

// Default target if none specified
group "default" {
    targets = ["backend-local", "frontend-local"]
}

// Backend targets
target "backend" {
    inherits = ["docker-metadata-action"]
    context = "./backend"
    dockerfile = "Dockerfile"
    target = "runner"
}

target "backend-local" {
    inherits = ["backend"]
    output = ["type=docker"]
}

target "backend-all" {
    inherits = ["backend"]
    platforms = [
        "linux/amd64",
        "linux/arm64"
    ]
}

// Frontend targets
target "frontend" {
    inherits = ["docker-metadata-action"]
    context = "./frontend"
    dockerfile = "Dockerfile"
    target = "production"
}

target "frontend-local" {
    inherits = ["frontend"]
    output = ["type=docker"]
}

target "frontend-all" {
    inherits = ["frontend"]
    platforms = [
        "linux/amd64",
        "linux/arm64"
    ]
}

// All services target
target "all" {
    inherits = ["backend-all", "frontend-all"]
}
