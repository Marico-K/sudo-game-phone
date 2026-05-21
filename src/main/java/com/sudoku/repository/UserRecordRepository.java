package com.sudoku.repository;

import com.sudoku.model.UserRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 用户记录数据访问层
 * 提供用户游戏记录的数据库操作方法
 */
@Repository
public interface UserRecordRepository extends JpaRepository<UserRecord, Long> {
    
    /**
     * 根据会话ID获取所有记录
     * @param sessionId 会话ID
     * @return 用户记录列表
     */
    List<UserRecord> findBySessionId(String sessionId);
    
    /**
     * 根据题目ID获取所有记录
     * @param puzzleId 题目ID
     * @return 用户记录列表
     */
    List<UserRecord> findByPuzzleId(Long puzzleId);
    
    /**
     * 根据会话ID和题目ID获取记录
     * @param sessionId 会话ID
     * @param puzzleId 题目ID
     * @return 用户记录（可选）
     */
    Optional<UserRecord> findBySessionIdAndPuzzleId(String sessionId, Long puzzleId);
    
    /**
     * 根据会话ID和完成状态获取记录
     * @param sessionId 会话ID
     * @param isCompleted 是否完成
     * @return 用户记录列表
     */
    List<UserRecord> findBySessionIdAndIsCompleted(String sessionId, Boolean isCompleted);
    
    /**
     * 根据会话ID获取记录，并强制加载关联的题目信息
     * 解决JPA延迟加载导致的序列化问题
     * @param sessionId 会话ID
     * @return 用户记录列表（包含题目信息）
     */
    @Query("SELECT ur FROM UserRecord ur JOIN FETCH ur.puzzle WHERE ur.sessionId = :sessionId")
    List<UserRecord> findBySessionIdWithPuzzle(@Param("sessionId") String sessionId);
}