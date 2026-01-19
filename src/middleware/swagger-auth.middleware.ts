import { Elysia } from "elysia";

/**
 * Basic Authentication Middleware for Swagger
 * Protects Swagger documentation with username/password
 */
export const swaggerAuth = (credentials: { username: string; password: string }) => {
    return new Elysia()
        .derive(({ headers }) => {
            const authHeader = headers.authorization;

            if (!authHeader || !authHeader.startsWith("Basic ")) {
                return { isSwaggerAuthorized: false };
            }

            try {
                // Decode Base64 credentials
                const base64Credentials = authHeader.split(" ")[1];
                const decodedCredentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
                const [username, password] = decodedCredentials.split(":");

                // Validate credentials
                const isValid =
                    username === credentials.username && password === credentials.password;

                return { isSwaggerAuthorized: isValid };
            } catch (error) {
                return { isSwaggerAuthorized: false };
            }
        })
        .onBeforeHandle(({ isSwaggerAuthorized, set, path }) => {
            // Only protect Swagger endpoints
            if (path.startsWith("/pbjt-library-api")) {
                if (!isSwaggerAuthorized) {
                    set.status = 401;
                    set.headers["WWW-Authenticate"] = 'Basic realm="Swagger Documentation"';
                    return {
                        error: "Unauthorized",
                        message: "Please provide valid credentials to access API documentation",
                    };
                }
            }
        });
};
