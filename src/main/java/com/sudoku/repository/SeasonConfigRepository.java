package com.sudoku.repository;

import com.sudoku.model.SeasonConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 赛季配置数据访问层
 * 提供赛季配置的数据库操作方法
 */
@Repository
public interface SeasonConfigRepository extends JpaRepository<SeasonConfig, Long> {
    
    /**
     * 按赛季编号降序获取所有赛季配置
     * @return 赛季配置列表
     */
    List<SeasonConfig> findAllByOrderBySeasonNumberDesc();
    
    /**
     * 获取最新的赛季配置（赛季编号最大的）
     * @return 当前赛季配置
     */
    SeasonConfig findTopByOrderBySeasonNumberDesc();
}