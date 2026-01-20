import chalk from "chalk";
import ora, { Ora } from "ora";

export class Logger {
    private static spinner: Ora | null = null;
    private static isDebug = false;

    /**
     * 设置调试模式。
     * @param debug - 是否开启调试输出。
     */
    static setDebugMode(debug: boolean) {
        this.isDebug = debug;
    }

    /**
     * 打印信息日志（蓝色）。
     * 如果 Spinner 正在运行，则通过 Spinner 输出。
     */
    static info(message: string) {
        if (this.spinner) {
            this.spinner.info(message);
        } else {
            console.log(chalk.blue("ℹ"), message);
        }
    }

    /**
     * 打印成功日志（绿色）。
     * 会停止当前的 Spinner（如果存在）。
     */
    static success(message: string) {
        if (this.spinner) {
            this.spinner.succeed(message);
            this.spinner = null;
        } else {
            console.log(chalk.green("✔"), message);
        }
    }

    /**
     * 打印警告日志（黄色）。
     */
    static warn(message: string) {
        if (this.spinner) {
            this.spinner.warn(message);
            this.spinner = null; // Stops spinner on warning? Usually depends on UX.
        } else {
            console.log(chalk.yellow("⚠"), message);
        }
    }

    /**
     * 打印错误日志（红色）。
     * 如果是 Error 对象且开启了调试模式，会打印堆栈。
     */
    static error(message: string | Error) {
        const msg = message instanceof Error ? message.message : message;
        if (this.spinner) {
            this.spinner.fail(chalk.red(msg));
            this.spinner = null;
        } else {
            console.error(chalk.red("✖"), msg);
        }
        if (message instanceof Error && this.isDebug) {
            console.error(message.stack);
        }
    }

    static debug(message: string) {
        if (this.isDebug) {
            console.log(chalk.gray(`[DEBUG] ${message}`));
        }
    }

    /**
     * 启动加载 Loading 动画。
     */
    static startSpinner(text: string) {
        if (this.spinner) {
            this.spinner.text = text;
        } else {
            this.spinner = ora(text).start();
        }
    }

    static stopSpinner() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
}
