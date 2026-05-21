package com.sudoku.service;

import com.sudoku.model.SudokuPuzzle;
import com.sudoku.model.UserRecord;
import com.sudoku.repository.SudokuPuzzleRepository;
import com.sudoku.repository.UserRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

/**
 * 游戏服务类
 * 提供数独游戏的核心业务逻辑
 */
@Service
public class GameService {
    
    @Autowired
    private SudokuPuzzleRepository puzzleRepository;
    
    @Autowired
    private UserRecordRepository userRecordRepository;
    
    @Autowired
    private SudokuService sudokuService;
    
    /**
     * 随机数生成器
     */
    private final Random random = new Random();
    
    /**
     * 创建新用户会话
     * @return 会话ID（UUID格式）
     */
    public String createSession() {
        return UUID.randomUUID().toString();
    }

    /**
     * 获取随机题目
     * @param difficulty 难度等级
     * @return 随机题目
     */
    public SudokuPuzzle getRandomPuzzle(SudokuPuzzle.Difficulty difficulty) {
        List<SudokuPuzzle> puzzles = puzzleRepository.findByDifficultyAndIsDeletedFalse(difficulty);
        if (puzzles.isEmpty()) {
            throw new RuntimeException("没有找到该难度的题目: " + difficulty);
        }
        return puzzles.get(random.nextInt(puzzles.size()));
    }

    /**
     * 根据ID获取题目
     * @param id 题目ID
     * @return 题目详情
     */
    public SudokuPuzzle getPuzzleById(Long id) {
        return puzzleRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("找不到题目，ID: " + id));
    }
    
    /**
     * 根据难度获取所有题目
     * @param difficulty 难度等级
     * @return 题目列表
     */
    public List<SudokuPuzzle> getPuzzlesByDifficulty(SudokuPuzzle.Difficulty difficulty) {
        return puzzleRepository.findByDifficultyAndIsDeletedFalse(difficulty);
    }
    
    /**
     * 开始游戏（记录用户开始尝试）
     * @param sessionId 用户会话ID
     * @param puzzleId 题目ID
     * @return 用户记录
     */
    @Transactional
    public UserRecord startGame(String sessionId, Long puzzleId) {
        // 获取题目
        SudokuPuzzle puzzle = getPuzzleById(puzzleId);
        
        // 查找是否已有该用户的记录
        Optional<UserRecord> existingRecord = userRecordRepository
                .findBySessionIdAndPuzzleId(sessionId, puzzleId);
        
        UserRecord record;
        if (existingRecord.isPresent()) {
            // 更新尝试次数
            record = existingRecord.get();
            record.setAttemptCount(record.getAttemptCount() + 1);
        } else {
            // 创建新记录
            record = new UserRecord();
            record.setSessionId(sessionId);
            record.setPuzzle(puzzle);
            record.setAttemptCount(1);
            record.setIsCompleted(false);
            record.setIsBestTime(false);
            record.setCompletionTime(0);
            record.setBestTime(null);
            // 设置赛季号
            record.setSeasonNumber(puzzle.getSeasonNumber());
        }
        
        return userRecordRepository.save(record);
    }
    
    /**
     * 完成游戏
     * @param sessionId 用户会话ID
     * @param puzzleId 题目ID
     * @param completionTime 完成时间（秒）
     * @return 更新后的用户记录
     */
    @Transactional
    public UserRecord completeGame(String sessionId, Long puzzleId, int completionTime) {
        UserRecord record = userRecordRepository.findBySessionIdAndPuzzleId(sessionId, puzzleId)
                .orElseThrow(() -> new RuntimeException("找不到游戏记录"));
        
        // 更新完成时间
        record.setCompletionTime(completionTime);
        record.setIsCompleted(true);
        
        // 判断是否是最佳成绩
        Integer currentBest = record.getBestTime();
        if (currentBest == null || completionTime < currentBest) {
            record.setBestTime(completionTime);
            record.setIsBestTime(true);
        } else {
            record.setIsBestTime(false);
        }
        
        return userRecordRepository.save(record);
    }
    
    /**
     * 获取用户所有记录
     * @param sessionId 用户会话ID
     * @return 用户记录列表（包含题目信息）
     */
    public List<UserRecord> getUserRecords(String sessionId) {
        return userRecordRepository.findBySessionIdWithPuzzle(sessionId);
    }
    
    /**
     * 获取用户已完成的记录
     * @param sessionId 用户会话ID
     * @return 已完成记录列表
     */
    public List<UserRecord> getCompletedRecords(String sessionId) {
        return userRecordRepository.findBySessionIdAndIsCompleted(sessionId, true);
    }
    
    /**
     * 获取指定题目记录
     * @param sessionId 用户会话ID
     * @param puzzleId 题目ID
     * @return 用户记录（可选）
     */
    public Optional<UserRecord> getRecord(String sessionId, Long puzzleId) {
        return userRecordRepository.findBySessionIdAndPuzzleId(sessionId, puzzleId);
    }
    
    /**
     * 验证答案是否正确
     * @param userSolution 用户答案
     * @param correctSolution 正确答案
     * @return 是否正确
     */
    public boolean validateSolution(String userSolution, String correctSolution) {
        return userSolution.equals(correctSolution);
    }
    
    /**
     * 验证部分答案（检查是否与原题目冲突）
     * @param currentBoard 当前棋盘状态
     * @param originalPuzzle 原始题目
     * @return 是否有效
     */
    public boolean validatePartialSolution(String currentBoard, String originalPuzzle) {
        int[][] board = sudokuService.stringToBoard(currentBoard);
        int[][] original = sudokuService.stringToBoard(originalPuzzle);
        
        // 检查用户输入是否覆盖了原始题目中的数字
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                if (original[i][j] != 0 && board[i][j] != original[i][j]) {
                    return false;
                }
            }
        }
        
        // 检查当前棋盘是否是有效的数独
        return sudokuService.isValidSudoku(board);
    }
    
    /**
     * 格式化时间（秒 -> MM:SS）
     * @param seconds 秒数
     * @return 格式化后的时间字符串
     */
    public String formatTime(int seconds) {
        int minutes = seconds / 60;
        int remainingSeconds = seconds % 60;
        return String.format("%02d:%02d", minutes, remainingSeconds);
    }
}