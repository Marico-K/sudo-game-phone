package com.sudoku.service;

import org.springframework.stereotype.Service;

/**
 * 数独核心服务类
 * 提供数独验证和转换相关的工具方法
 */
@Service
public class SudokuService {
    
    /**
     * 数独棋盘大小
     */
    private static final int SIZE = 9;
    
    /**
     * 检查数独是否有效（不重复）
     * @param board 9x9的数独棋盘
     * @return 是否有效
     */
    public boolean isValidSudoku(int[][] board) {
        // 检查每行
        for (int i = 0; i < SIZE; i++) {
            if (!isValidRow(board, i)) {
                return false;
            }
        }
        
        // 检查每列
        for (int j = 0; j < SIZE; j++) {
            if (!isValidColumn(board, j)) {
                return false;
            }
        }
        
        // 检查每个3x3宫格
        for (int boxRow = 0; boxRow < SIZE; boxRow += 3) {
            for (int boxCol = 0; boxCol < SIZE; boxCol += 3) {
                if (!isValidBox(board, boxRow, boxCol)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 检查某行是否有效
     * @param board 棋盘
     * @param row 行索引
     * @return 是否有效
     */
    private boolean isValidRow(int[][] board, int row) {
        boolean[] seen = new boolean[SIZE + 1];
        for (int j = 0; j < SIZE; j++) {
            int num = board[row][j];
            if (num != 0) {
                if (seen[num]) {
                    return false;
                }
                seen[num] = true;
            }
        }
        return true;
    }
    
    /**
     * 检查某列是否有效
     * @param board 棋盘
     * @param col 列索引
     * @return 是否有效
     */
    private boolean isValidColumn(int[][] board, int col) {
        boolean[] seen = new boolean[SIZE + 1];
        for (int i = 0; i < SIZE; i++) {
            int num = board[i][col];
            if (num != 0) {
                if (seen[num]) {
                    return false;
                }
                seen[num] = true;
            }
        }
        return true;
    }
    
    /**
     * 检查某3x3宫格是否有效
     * @param board 棋盘
     * @param startRow 起始行
     * @param startCol 起始列
     * @return 是否有效
     */
    private boolean isValidBox(int[][] board, int startRow, int startCol) {
        boolean[] seen = new boolean[SIZE + 1];
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                int num = board[startRow + i][startCol + j];
                if (num != 0) {
                    if (seen[num]) {
                        return false;
                    }
                    seen[num] = true;
                }
            }
        }
        return true;
    }
    
    /**
     * 检查数独是否完整（填满且有效）
     * @param board 棋盘
     * @return 是否完整
     */
    public boolean isComplete(int[][] board) {
        // 检查是否有空格
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                if (board[i][j] == 0) {
                    return false;
                }
            }
        }
        // 检查是否有效
        return isValidSudoku(board);
    }
    
    /**
     * 检查某个位置填入数字是否安全
     * @param board 棋盘
     * @param row 行索引
     * @param col 列索引
     * @param num 要填入的数字
     * @return 是否安全
     */
    public boolean isSafe(int[][] board, int row, int col, int num) {
        // 检查同行
        for (int j = 0; j < SIZE; j++) {
            if (board[row][j] == num) {
                return false;
            }
        }
        
        // 检查同列
        for (int i = 0; i < SIZE; i++) {
            if (board[i][col] == num) {
                return false;
            }
        }
        
        // 检查同3x3宫格
        int startRow = row - row % 3;
        int startCol = col - col % 3;
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (board[startRow + i][startCol + j] == num) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 将81位字符串转换为9x9二维数组
     * @param str 81位字符串（0表示空格）
     * @return 9x9二维数组
     */
    public int[][] stringToBoard(String str) {
        int[][] board = new int[SIZE][SIZE];
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                board[i][j] = Character.getNumericValue(str.charAt(i * SIZE + j));
            }
        }
        return board;
    }
    
    /**
     * 将9x9二维数组转换为81位字符串
     * @param board 9x9二维数组
     * @return 81位字符串
     */
    public String boardToString(int[][] board) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                sb.append(board[i][j]);
            }
        }
        return sb.toString();
    }
}