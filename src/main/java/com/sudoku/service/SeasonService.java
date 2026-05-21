package com.sudoku.service;

import com.sudoku.model.SeasonConfig;
import com.sudoku.model.SudokuPuzzle;
import com.sudoku.repository.SeasonConfigRepository;
import com.sudoku.repository.SudokuPuzzleRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * 赛季服务类
 * 管理数独题目赛季的生成、更新和查询逻辑
 */
@Service
public class SeasonService {
    
    @Autowired
    private SeasonConfigRepository seasonConfigRepository;
    
    @Autowired
    private SudokuPuzzleRepository puzzleRepository;
    
    /**
     * 数独棋盘大小
     */
    private static final int SIZE = 9;
    
    /**
     * 随机数生成器
     */
    private static final Random RANDOM = new Random();
    
    /**
     * 当前解计数（用于数独生成时检测唯一解）
     */
    private int solutionCount;
    
    /**
     * 每种难度的题目数量
     */
    private static final int PUZZLES_PER_DIFFICULTY = 50;
    
    /**
     * 简单难度空格数
     */
    private static final int EASY_EMPTY_CELLS = 35;
    
    /**
     * 中等难度空格数
     */
    private static final int MEDIUM_EMPTY_CELLS = 45;
    
    /**
     * 困难难度空格数
     */
    private static final int HARD_EMPTY_CELLS = 55;
    
    /**
     * 自动重新生成间隔（天数）
     */
    private static final int REGEN_INTERVAL_DAYS = 30;
    
    /**
     * 应用启动时初始化赛季（如果需要）
     * 如果没有赛季配置或需要自动更新，则创建新赛季
     */
    @Transactional
    public void initializeSeasonIfNeeded() {
        // 获取最新的赛季配置
        SeasonConfig latest = seasonConfigRepository.findTopByOrderBySeasonNumberDesc();
        
        // 如果没有赛季配置，创建第一个赛季
        if (latest == null) {
            createNewSeason(1);
            return;
        }
        
        // 如果已到自动更新时间且未手动更新过，自动创建新赛季
        if (shouldAutoRegenerate(latest)) {
            createNewSeason(latest.getSeasonNumber() + 1);
        }
    }
    
    /**
     * 判断是否应该自动重新生成赛季
     * @param config 当前赛季配置
     * @return 是否需要自动更新
     */
    private boolean shouldAutoRegenerate(SeasonConfig config) {
        return LocalDateTime.now().isAfter(config.getNextAutoRegenAt()) && !config.getManualRegenTriggered();
    }
    
    /**
     * 创建新赛季
     * @param seasonNumber 赛季编号
     * @return 新创建的赛季配置
     */
    @Transactional
    public SeasonConfig createNewSeason(int seasonNumber) {
        // 将旧赛季题目标记为已删除（逻辑删除）
        List<SudokuPuzzle> allPuzzles = puzzleRepository.findAll();
        allPuzzles.forEach(puzzle -> {
            puzzle.setIsDeleted(true);
        });
        puzzleRepository.saveAll(allPuzzles);
        
        // 生成新题目
        List<SudokuPuzzle> puzzles = new ArrayList<>();
        puzzles.addAll(generatePuzzles(PUZZLES_PER_DIFFICULTY, EASY_EMPTY_CELLS, SudokuPuzzle.Difficulty.EASY, 1, seasonNumber));
        puzzles.addAll(generatePuzzles(PUZZLES_PER_DIFFICULTY, MEDIUM_EMPTY_CELLS, SudokuPuzzle.Difficulty.MEDIUM, 2, seasonNumber));
        puzzles.addAll(generatePuzzles(PUZZLES_PER_DIFFICULTY, HARD_EMPTY_CELLS, SudokuPuzzle.Difficulty.HARD, 3, seasonNumber));
        
        // 保存所有题目
        puzzleRepository.saveAll(puzzles);
        
        // 创建赛季配置
        SeasonConfig config = new SeasonConfig();
        config.setSeasonNumber(seasonNumber);
        config.setInitializedAt(LocalDateTime.now());
        config.setNextAutoRegenAt(LocalDateTime.now().plusDays(REGEN_INTERVAL_DAYS));
        config.setManualRegenTriggered(false);
        
        SeasonConfig saved = seasonConfigRepository.save(config);
        
        System.out.println("成功创建赛季 " + seasonNumber + "，共 " + puzzles.size() + " 道题目！");
        return saved;
    }
    
    /**
     * 手动触发赛季重新生成
     * @return 新创建的赛季配置
     */
    @Transactional
    public SeasonConfig triggerManualRegeneration() {
        SeasonConfig latest = seasonConfigRepository.findTopByOrderBySeasonNumberDesc();
        int nextSeason = latest != null ? latest.getSeasonNumber() + 1 : 1;
        
        SeasonConfig newSeason = createNewSeason(nextSeason);
        // 标记为手动触发
        newSeason.setManualRegenTriggered(true);
        return seasonConfigRepository.save(newSeason);
    }
    
    /**
     * 获取当前赛季配置
     * @return 当前赛季配置
     */
    public SeasonConfig getCurrentSeason() {
        return seasonConfigRepository.findTopByOrderBySeasonNumberDesc();
    }
    
    /**
     * 获取所有赛季配置
     * @return 赛季配置列表（按编号降序）
     */
    public List<SeasonConfig> getAllSeasons() {
        return seasonConfigRepository.findAllByOrderBySeasonNumberDesc();
    }
    
    /**
     * 批量生成指定难度的数独题目
     * @param count 题目数量
     * @param emptyCells 空格数（决定难度）
     * @param difficulty 难度等级
     * @param level 难度级别数字
     * @param seasonNumber 赛季编号
     * @return 生成的题目列表
     */
    private List<SudokuPuzzle> generatePuzzles(int count, int emptyCells, SudokuPuzzle.Difficulty difficulty, int level, int seasonNumber) {
        List<SudokuPuzzle> puzzles = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            // 生成完整的数独终盘
            int[][] fullBoard = generateFullBoard();
            // 挖空生成题目（保证唯一解）
            int[][] puzzle = createPuzzle(fullBoard, emptyCells);
            
            SudokuPuzzle p = new SudokuPuzzle();
            p.setPuzzle(boardToString(puzzle));
            p.setSolution(boardToString(fullBoard));
            p.setDifficulty(difficulty);
            p.setDifficultyLevel(level);
            p.setSeasonNumber(seasonNumber);
            p.setIsDeleted(false);
            puzzles.add(p);
        }
        return puzzles;
    }
    
    /**
     * 生成完整的数独终盘
     * @return 9x9的完整数独棋盘
     */
    private int[][] generateFullBoard() {
        int[][] board = new int[SIZE][SIZE];
        fillBoard(board, 0, 0);
        return board;
    }
    
    /**
     * 使用回溯算法填充数独棋盘
     * @param board 棋盘数组
     * @param row 当前行
     * @param col 当前列
     * @return 是否填充成功
     */
    private boolean fillBoard(int[][] board, int row, int col) {
        // 所有行都填充完毕
        if (row == SIZE) return true;
        
        // 计算下一个位置
        int nextRow = col == SIZE - 1 ? row + 1 : row;
        int nextCol = col == SIZE - 1 ? 0 : col + 1;
        
        // 随机打乱1-9的顺序，生成随机数独
        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= 9; i++) nums.add(i);
        Collections.shuffle(nums, RANDOM);
        
        // 尝试填入每个数字
        for (int num : nums) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (fillBoard(board, nextRow, nextCol)) return true;
                board[row][col] = 0; // 回溯
            }
        }
        return false;
    }
    
    /**
     * 校验某个位置是否可以填入指定数字
     * @param board 棋盘数组
     * @param row 行索引
     * @param col 列索引
     * @param num 要填入的数字
     * @return 是否有效
     */
    private boolean isValid(int[][] board, int row, int col, int num) {
        // 检查同行是否已有该数字
        for (int c = 0; c < SIZE; c++) {
            if (board[row][c] == num) return false;
        }
        
        // 检查同列是否已有该数字
        for (int r = 0; r < SIZE; r++) {
            if (board[r][col] == num) return false;
        }
        
        // 检查同3x3宫格是否已有该数字
        int boxRow = row - row % 3;
        int boxCol = col - col % 3;
        for (int r = boxRow; r < boxRow + 3; r++) {
            for (int c = boxCol; c < boxCol + 3; c++) {
                if (board[r][c] == num) return false;
            }
        }
        return true;
    }
    
    /**
     * 通过挖空生成数独题目（保证唯一解）
     * @param fullBoard 完整的数独终盘
     * @param emptyCount 需要挖空的数量
     * @return 生成的题目棋盘
     */
    private int[][] createPuzzle(int[][] fullBoard, int emptyCount) {
        int[][] puzzle = new int[SIZE][SIZE];
        // 复制完整棋盘
        for (int i = 0; i < SIZE; i++) {
            System.arraycopy(fullBoard[i], 0, puzzle[i], 0, SIZE);
        }
        
        int empty = 0;
        // 创建所有位置的列表并打乱
        List<int[]> positions = new ArrayList<>();
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                positions.add(new int[]{i, j});
            }
        }
        Collections.shuffle(positions, RANDOM);
        
        // 随机挖空
        for (int[] pos : positions) {
            if (empty >= emptyCount) break;
            int r = pos[0], c = pos[1];
            
            // 如果已经是空的，跳过
            if (puzzle[r][c] == 0) continue;
            
            // 暂存原始值
            int temp = puzzle[r][c];
            puzzle[r][c] = 0;
            
            // 检查是否仍有唯一解
            if (getSolutionCount(puzzle) == 1) {
                empty++;
            } else {
                // 多解则回填
                puzzle[r][c] = temp;
            }
        }
        return puzzle;
    }
    
    /**
     * 计算数独的解数量（最多统计2个，提前剪枝）
     * @param board 棋盘数组
     * @return 解的数量（0、1或2）
     */
    private int getSolutionCount(int[][] board) {
        solutionCount = 0;
        int[][] copy = new int[SIZE][SIZE];
        for (int i = 0; i < SIZE; i++) {
            System.arraycopy(board[i], 0, copy[i], 0, SIZE);
        }
        countSolve(copy, 0, 0);
        return solutionCount;
    }
    
    /**
     * 使用回溯算法统计解的数量
     * @param board 棋盘数组
     * @param row 当前行
     * @param col 当前列
     */
    private void countSolve(int[][] board, int row, int col) {
        // 找到2个解直接停止
        if (solutionCount >= 2) return;
        
        // 完成一个解
        if (row == SIZE) {
            solutionCount++;
            return;
        }
        
        int nextRow = col == SIZE - 1 ? row + 1 : row;
        int nextCol = col == SIZE - 1 ? 0 : col + 1;
        
        // 如果当前位置已有数字，继续下一个
        if (board[row][col] != 0) {
            countSolve(board, nextRow, nextCol);
            return;
        }
        
        // 尝试填入1-9
        for (int num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                countSolve(board, nextRow, nextCol);
                board[row][col] = 0;
            }
        }
    }
    
    /**
     * 将二维数组转换为81位字符串
     * @param board 棋盘数组
     * @return 81位字符串（0表示空格）
     */
    private String boardToString(int[][] board) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                sb.append(board[i][j]);
            }
        }
        return sb.toString();
    }
}