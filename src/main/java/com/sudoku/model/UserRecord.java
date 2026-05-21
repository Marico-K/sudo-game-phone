package com.sudoku.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户游戏记录实体类
 * 记录用户在每道题目上的游戏数据
 */
@Entity
@Table(name = "user_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRecord {
    
    /**
     * 主键ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * 关联的数独题目（延迟加载）
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "puzzle_id", nullable = false)
    private SudokuPuzzle puzzle;
    
    /**
     * 用户会话ID
     */
    @Column(nullable = false)
    private String sessionId;
    
    /**
     * 完成时间（秒）
     */
    @Column(nullable = false)
    private Integer completionTime;
    
    /**
     * 是否完成
     */
    @Column(nullable = false)
    private Boolean isCompleted;
    
    /**
     * 是否是最佳成绩
     */
    @Column(nullable = false)
    private Boolean isBestTime;
    
    /**
     * 尝试次数
     */
    @Column(nullable = false)
    private Integer attemptCount;
    
    /**
     * 最佳用时（秒）
     */
    @Column
    private Integer bestTime;
    
    /**
     * 所属赛季编号
     */
    @Column
    private Integer seasonNumber;
}