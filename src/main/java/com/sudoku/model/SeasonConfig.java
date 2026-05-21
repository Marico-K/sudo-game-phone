package com.sudoku.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 赛季配置实体类
 * 用于管理数独题目的赛季周期，支持自动和手动重新生成题目
 */
@Entity
@Table(name = "season_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeasonConfig {
    
    /**
     * 主键ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * 赛季编号
     */
    @Column(nullable = false)
    private Integer seasonNumber;
    
    /**
     * 赛季初始化时间
     */
    @Column(nullable = false)
    private LocalDateTime initializedAt;
    
    /**
     * 下次自动重新生成时间（30天后）
     */
    @Column(nullable = false)
    private LocalDateTime nextAutoRegenAt;
    
    /**
     * 是否是手动触发的重新生成
     */
    @Column(nullable = false)
    private Boolean manualRegenTriggered;
}