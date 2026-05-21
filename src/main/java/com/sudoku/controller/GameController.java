package com.sudoku.controller;

import com.sudoku.model.SudokuPuzzle;
import com.sudoku.model.UserRecord;
import com.sudoku.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.Cookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 游戏控制器
 * 提供数独游戏相关的API接口
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GameController {
    
    @Autowired
    private GameService gameService;
    
    /**
     * 创建新用户会话
     * @return 会话ID
     */
    @PostMapping("/session")
    public ResponseEntity<Map<String, String>> createSession() {
        String sessionId = gameService.createSession();
        Map<String, String> response = new HashMap<>();
        response.put("sessionId", sessionId);
        
        Cookie cookie = new Cookie("sudokuSessionId", sessionId);
        cookie.setHttpOnly(false);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(365 * 24 * 60 * 60); // 1年有效期
        
        return ResponseEntity.ok()
                .header("Set-Cookie", cookie.getName() + "=" + cookie.getValue() + 
                        "; Path=" + cookie.getPath() + 
                        "; Max-Age=" + cookie.getMaxAge() + 
                        "; SameSite=Lax")
                .body(response);
    }

    /**
     * 根据难度获取所有题目
     * @param difficulty 难度等级（EASY/MEDIUM/HARD）
     * @return 题目列表
     */
    @GetMapping("/puzzles/{difficulty}")
    public ResponseEntity<List<SudokuPuzzle>> getPuzzlesByDifficulty(@PathVariable String difficulty) {
        SudokuPuzzle.Difficulty diff = SudokuPuzzle.Difficulty.valueOf(difficulty.toUpperCase());
        List<SudokuPuzzle> puzzles = gameService.getPuzzlesByDifficulty(diff);
        return ResponseEntity.ok(puzzles);
    }

    /**
     * 获取随机题目
     * @param difficulty 难度等级
     * @return 随机题目
     */
    @GetMapping("/puzzle/random/{difficulty}")
    public ResponseEntity<SudokuPuzzle> getRandomPuzzle(@PathVariable String difficulty) {
        SudokuPuzzle.Difficulty diff = SudokuPuzzle.Difficulty.valueOf(difficulty.toUpperCase());
        SudokuPuzzle puzzle = gameService.getRandomPuzzle(diff);
        return ResponseEntity.ok(puzzle);
    }

    /**
     * 根据ID获取题目
     * @param id 题目ID
     * @return 题目详情
     */
    @GetMapping("/puzzle/{id}")
    public ResponseEntity<SudokuPuzzle> getPuzzleById(@PathVariable Long id) {
        SudokuPuzzle puzzle = gameService.getPuzzleById(id);
        return ResponseEntity.ok(puzzle);
    }
    
    /**
     * 开始游戏
     * @param sessionId 用户会话ID
     * @param puzzleId 题目ID
     * @return 用户记录
     */
    @PostMapping("/game/start")
    public ResponseEntity<UserRecord> startGame(@RequestParam String sessionId, @RequestParam Long puzzleId) {
        UserRecord record = gameService.startGame(sessionId, puzzleId);
        return ResponseEntity.ok(record);
    }
    
    /**
     * 完成游戏
     * @param sessionId 用户会话ID
     * @param puzzleId 题目ID
     * @param completionTime 完成时间（秒）
     * @return 更新后的用户记录
     */
    @PostMapping("/game/complete")
    public ResponseEntity<UserRecord> completeGame(@RequestParam String sessionId, 
                                                   @RequestParam Long puzzleId, 
                                                   @RequestParam int completionTime) {
        UserRecord record = gameService.completeGame(sessionId, puzzleId, completionTime);
        return ResponseEntity.ok(record);
    }
    
    /**
     * 获取用户所有记录
     * @param sessionId 用户会话ID
     * @return 用户记录列表
     */
    @GetMapping("/records/{sessionId}")
    public ResponseEntity<List<UserRecord>> getUserRecords(@PathVariable String sessionId) {
        List<UserRecord> records = gameService.getUserRecords(sessionId);
        return ResponseEntity.ok(records);
    }
    
    /**
     * 获取用户已完成的记录
     * @param sessionId 用户会话ID
     * @return 已完成记录列表
     */
    @GetMapping("/records/{sessionId}/completed")
    public ResponseEntity<List<UserRecord>> getCompletedRecords(@PathVariable String sessionId) {
        List<UserRecord> records = gameService.getCompletedRecords(sessionId);
        return ResponseEntity.ok(records);
    }
    
    /**
     * 获取指定题目记录
     * @param sessionId 用户会话ID
     * @param puzzleId 题目ID
     * @return 用户记录（可选）
     */
    @GetMapping("/record/{sessionId}/{puzzleId}")
    public ResponseEntity<UserRecord> getRecord(@PathVariable String sessionId, @PathVariable Long puzzleId) {
        return gameService.getRecord(sessionId, puzzleId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * 验证答案
     * @param userSolution 用户答案（81位字符串）
     * @param correctSolution 正确答案（81位字符串）
     * @return 是否正确
     */
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Boolean>> validateSolution(@RequestParam String userSolution, 
                                                                  @RequestParam String correctSolution) {
        boolean isValid = gameService.validateSolution(userSolution, correctSolution);
        Map<String, Boolean> response = new HashMap<>();
        response.put("valid", isValid);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 验证部分答案（检查是否与原题目冲突）
     * @param currentBoard 当前棋盘状态
     * @param originalPuzzle 原始题目
     * @return 是否有效
     */
    @PostMapping("/validate/partial")
    public ResponseEntity<Map<String, Boolean>> validatePartialSolution(@RequestParam String currentBoard, 
                                                                         @RequestParam String originalPuzzle) {
        boolean isValid = gameService.validatePartialSolution(currentBoard, originalPuzzle);
        Map<String, Boolean> response = new HashMap<>();
        response.put("valid", isValid);
        return ResponseEntity.ok(response);
    }
}