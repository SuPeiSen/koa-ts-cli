import { execSync } from "child_process";
import path from "path";
import { existsSync, readdirSync } from "fs";
import dotenv from "dotenv";
import { Logger } from "../core/logger.js";

export class PrismaCommand {
    /**
     * Execute prisma db pull and generate.
     * Loads environment variables from `env/*.env` before execution.
     */
    static execute() {
        this.loadEnv();

        Logger.info("Executing Prisma DB Pull and Generate...");
        try {
            execSync("npx prisma db pull && npx prisma generate", {
                stdio: "inherit",
                env: { ...process.env }, // Explicitly pass the updated env
            });
            Logger.success("Prisma schema updated and client generated successfully!");
        } catch (e) {
            Logger.error(e as Error);
            process.exit(1);
        }
    }

    /**
     * Load environment variables from `env` directory.
     */
    private static loadEnv() {
        const envDir = path.join(process.cwd(), "env");
        if (!existsSync(envDir)) {
            Logger.warn("env directory not found, skipping env loading");
            return;
        }

        const files = readdirSync(envDir);
        files.forEach((file) => {
            if (file.endsWith(".env")) {
                const envPath = path.join(envDir, file);
                dotenv.config({ path: envPath });
                Logger.info(`Loaded env file: ${file}`);
            }
        });
    }
}
