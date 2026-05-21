package com.sudoku.data;

import com.sudoku.service.SeasonService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 数据初始化器
 * 在应用启动时执行初始化操作
 */
@Component
public class SudokuDataInitializer implements CommandLineRunner {
    
    /**
     * 赛季服务
     */
    private final SeasonService seasonService;
    
    /**
     * 构造函数注入
     * @param seasonService 赛季服务实例
     */
    public SudokuDataInitializer(SeasonService seasonService) {
        this.seasonService = seasonService;
    }
    
    /**
     * 应用启动时执行的初始化方法
     * 调用赛季服务初始化赛季（如果需要）
     * @param args 命令行参数
     */
    @Override
    public void run(String... args) {
        seasonService.initializeSeasonIfNeeded();
    }
}