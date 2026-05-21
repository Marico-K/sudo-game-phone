package com.sudoku.controller;

import com.sudoku.model.SeasonConfig;
import com.sudoku.service.SeasonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 赛季控制器
 * 提供赛季管理相关的API接口
 */
@RestController
@RequestMapping("/api/season")
@CrossOrigin(origins = "*")
public class SeasonController {
    
    @Autowired
    private SeasonService seasonService;
    
    /**
     * 获取当前赛季信息
     * @return 当前赛季配置
     */
    @GetMapping("/current")
    public ResponseEntity<SeasonConfig> getCurrentSeason() {
        SeasonConfig current = seasonService.getCurrentSeason();
        if (current == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(current);
    }
    
    /**
     * 获取所有赛季记录
     * @return 赛季配置列表
     */
    @GetMapping("/all")
    public ResponseEntity<List<SeasonConfig>> getAllSeasons() {
        return ResponseEntity.ok(seasonService.getAllSeasons());
    }
    
    /**
     * 手动触发赛季重新生成
     * 删除所有旧题目并生成新的150道题目
     * @return 操作结果
     */
    @PostMapping("/regenerate")
    public ResponseEntity<Map<String, Object>> triggerRegeneration() {
        SeasonConfig newSeason = seasonService.triggerManualRegeneration();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "已成功生成新赛季题目");
        response.put("seasonNumber", newSeason.getSeasonNumber());
        response.put("initializedAt", newSeason.getInitializedAt());
        response.put("nextAutoRegenAt", newSeason.getNextAutoRegenAt());
        
        return ResponseEntity.ok(response);
    }
}