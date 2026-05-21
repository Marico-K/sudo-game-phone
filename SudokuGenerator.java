import java.util.*;

public class SudokuGenerator {
    private static final int SIZE = 9;
    private static final Random RANDOM = new Random();
    private int solutionCount;

    public int[][] generateFullBoard() {
        int[][] board = new int[SIZE][SIZE];
        fillBoard(board, 0, 0);
        return board;
    }

    private boolean fillBoard(int[][] board, int row, int col) {
        if (row == SIZE) return true;
        int nextRow = col == SIZE - 1 ? row + 1 : row;
        int nextCol = col == SIZE - 1 ? 0 : col + 1;

        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= 9; i++) nums.add(i);
        Collections.shuffle(nums, RANDOM);

        for (int num : nums) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (fillBoard(board, nextRow, nextCol)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    private boolean isValid(int[][] board, int row, int col, int num) {
        for (int c = 0; c < SIZE; c++) {
            if (board[row][c] == num) return false;
        }
        for (int r = 0; r < SIZE; r++) {
            if (board[r][col] == num) return false;
        }
        int boxRow = row - row % 3;
        int boxCol = col - col % 3;
        for (int r = boxRow; r < boxRow + 3; r++) {
            for (int c = boxCol; c < boxCol + 3; c++) {
                if (board[r][c] == num) return false;
            }
        }
        return true;
    }

    public int[][] createPuzzle(int[][] fullBoard, int emptyCount) {
        int[][] puzzle = new int[SIZE][SIZE];
        for (int i = 0; i < SIZE; i++) {
            System.arraycopy(fullBoard[i], 0, puzzle[i], 0, SIZE);
        }

        int empty = 0;
        List<int[]> positions = new ArrayList<>();
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                positions.add(new int[]{i, j});
            }
        }
        Collections.shuffle(positions, RANDOM);

        for (int[] pos : positions) {
            if (empty >= emptyCount) break;
            int r = pos[0], c = pos[1];
            if (puzzle[r][c] == 0) continue;

            int temp = puzzle[r][c];
            puzzle[r][c] = 0;

            if (getSolutionCount(puzzle) == 1) {
                empty++;
            } else {
                puzzle[r][c] = temp;
            }
        }
        return puzzle;
    }

    private int getSolutionCount(int[][] board) {
        solutionCount = 0;
        int[][] copy = new int[SIZE][SIZE];
        for (int i = 0; i < SIZE; i++) {
            System.arraycopy(board[i], 0, copy[i], 0, SIZE);
        }
        countSolve(copy, 0, 0);
        return solutionCount;
    }

    private void countSolve(int[][] board, int row, int col) {
        if (solutionCount >= 2) return;
        if (row == SIZE) {
            solutionCount++;
            return;
        }
        int nextRow = col == SIZE - 1 ? row + 1 : row;
        int nextCol = col == SIZE - 1 ? 0 : col + 1;

        if (board[row][col] != 0) {
            countSolve(board, nextRow, nextCol);
            return;
        }

        for (int num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                countSolve(board, nextRow, nextCol);
                board[row][col] = 0;
            }
        }
    }

    public String boardToString(int[][] board) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                sb.append(board[i][j]);
            }
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        SudokuGenerator generator = new SudokuGenerator();

        int[] emptyCounts = {35, 45, 55};
        String[] difficultyNames = {"EASY", "MEDIUM", "HARD"};
        String[] listNames = {"easyPuzzles", "mediumPuzzles", "hardPuzzles"};

        for (int d = 0; d < 3; d++) {
            String difficulty = difficultyNames[d];
            String listName = listNames[d];
            int emptyCount = emptyCounts[d];

            System.out.println("\n// ====================== " + difficulty + " (" + emptyCount + " empty) ======================");
            System.out.println("String[][] " + listName + " = {");

            for (int i = 0; i < 50; i++) {
                int[][] full = generator.generateFullBoard();
                int[][] puzzle = generator.createPuzzle(full, emptyCount);
                String puzzleStr = generator.boardToString(puzzle);
                String answerStr = generator.boardToString(full);
                System.out.println("    {\"" + puzzleStr + "\", \"" + answerStr + "\"},");
            }

            System.out.println("};");

            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {}
        }

        System.out.println("\n// Total: 150 puzzles (50 each difficulty)");
    }
}