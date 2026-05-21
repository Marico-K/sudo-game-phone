package com.sudoku.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 数独题目实体类
 * 存储数独题目和标准答案
 */
@Entity
@Table(name = "sudoku_puzzles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SudokuPuzzle {
    
    /**
     * 主键ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * 题目字符串（81位，0表示空格）
     */
    @Column(nullable = false, length = 81)
    private String puzzle;
    
    /**
     * 标准答案字符串（81位）
     */
    @Column(nullable = false, length = 81)
    private String solution;
    
    /**
     * 难度等级（EASY/MEDIUM/HARD）
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;
    
    /**
     * 难度级别数字（1=简单，2=中等，3=困难）
     */
    @Column(nullable = false)
    private Integer difficultyLevel;
    
    /**
     * 是否已删除（逻辑删除）
     */
    @Column
    private Boolean isDeleted = false;
    
    /**
     * 所属赛季编号
     */
    @Column
    private Integer seasonNumber = 1;
    
    /**
     * 难度枚举
     */
    public enum Difficulty {
        EASY,    // 简单（35个空格）
        MEDIUM,  // 中等（45个空格）
        HARD     // 困难（55个空格）
    }
}