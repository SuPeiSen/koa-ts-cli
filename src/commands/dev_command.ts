import { DevService } from "../services/dev_service.js";

export class DevCommand {
    /**
     * 执行启动开发服务器命令。
     * 实际上委托给 DevService.start()。
     */
    static async execute() {
        await DevService.start();
    }
}
