package com.sudoku.dto;

import com.sudoku.model.SudokuPuzzle;
import lombok.Data;

@Data
public class GameStartRequest {
    private String sessionId;
    private Long puzzleId;
}