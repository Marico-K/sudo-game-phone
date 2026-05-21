package com.sudoku.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {
    
    @GetMapping("/")
    public String index() {
        return "index";
    }
    
    @GetMapping("/game")
    public String game() {
        return "game";
    }
    
    @GetMapping("/records")
    public String records() {
        return "records";
    }
    
    @GetMapping("/puzzle-select")
    public String puzzleSelect() {
        return "puzzle-select";
    }
}