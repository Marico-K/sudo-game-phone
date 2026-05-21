package com.sudoku.repository;

import com.sudoku.model.SudokuPuzzle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SudokuPuzzleRepository extends JpaRepository<SudokuPuzzle, Long> {
    
    List<SudokuPuzzle> findByDifficultyAndIsDeletedFalse(SudokuPuzzle.Difficulty difficulty);
    
    Optional<SudokuPuzzle> findByIdAndIsDeletedFalse(Long id);
    
    List<SudokuPuzzle> findByDifficultyLevelAndIsDeletedFalse(Integer difficultyLevel);
    
    Optional<SudokuPuzzle> findByIdAndDifficultyAndIsDeletedFalse(Long id, SudokuPuzzle.Difficulty difficulty);
}