// ==================== 全局变量声明 ====================
let currentPuzzle = null;          // 当前数独题目信息 {id, puzzle, solution, gameType}
let originalPuzzle = '';           // 原始题目字符串（0表示空格）
let currentBoard = [];             // 当前棋盘状态数组（支持数字或候选数字数组）
let selectedCell = null;           // 选中的单元格 {row, col, index}
let selectedNumber = null;         // 选中的数字（1-9）或清除（0）
let timerInterval = null;          // 计时器定时器ID
let seconds = 0;                   // 游戏耗时（秒）
let currentGameType = '';        // 当前游戏类型
let currentDifficulty = '';      // 当前难度等级
let attemptCount = 0;              // 当前题目重置次数
let bestTime = null;               // 当前题目最佳成绩
let puzzleIdCounter = 0;           // 题目ID计数器
let cellsCache = null;             // 单元格DOM缓存
let iconMode = 'numbers';          // 图标模式: 'numbers', 'weather', 'animals'
let inputMode = 'exact';           // 输入模式: 'exact'（确定模式）, 'candidate'（草稿模式）

// 图标映射表
const iconMaps = {
    numbers: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    weather: ['', '☀️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌤️', '🌙', '🌈'],
    animals: ['', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨']
};

/**
 * 获取指定数字对应的图标
 * @param {number} num - 数字（1-9）
 * @returns {string} - 图标或数字字符串
 */
function getIcon(num) {
    return iconMaps[iconMode][num] || num.toString();
}

/**
 * 切换图标模式
 */
function toggleIconMode() {
    const modes = ['numbers', 'weather', 'animals'];
    const currentIndex = modes.indexOf(iconMode);
    iconMode = modes[(currentIndex + 1) % modes.length];
    renderBoard();
    updateNumberButtons();

    // 更新切换按钮的显示
    updateIconToggleButton();
}

/**
 * 更新图标切换按钮的显示
 */
function updateIconToggleButton() {
    const btn = document.getElementById('iconToggleBtn');
    if (btn) {
        const modeNames = {
            numbers: '🔢 数字'/*,
            weather: '☀️ 天气',
            animals: '🐾 动物'*/
        };
        btn.textContent = modeNames[iconMode] || '🔢 数字';
    }
}

/**
 * 切换输入模式（确定模式/草稿模式）
 */
function toggleInputMode() {
    inputMode = inputMode === 'exact' ? 'candidate' : 'exact';
    const btn = document.getElementById('modeToggleBtn');
    if (btn) {
        if (inputMode === 'candidate') {
            btn.textContent = '📝 草稿模式';
            btn.classList.add('candidate-mode');
        } else {
            btn.textContent = '✏️ 确定模式';
            btn.classList.remove('candidate-mode');
        }
    }
}

/**
 * 自动填写所有空格的候选数字
 */
function fillAllCandidates() {
    const size = currentPuzzle.size || 9;
    // 遍历所有格子
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;

            // 如果是固定数字，跳过
            if (originalPuzzle[index] !== '0') continue;

            // 获取当前格子的确定值（如果有）
            const currentValue = currentBoard[index];

            // 如果已经有确定值，跳过
            if (typeof currentValue === 'number' && currentValue !== 0) continue;

            // 计算该格子的候选数字
            const candidates = getCandidates(row, col);

            // 设置候选数字
            currentBoard[index] = candidates;
        }
    }

    // 更新显示
    renderBoard();

    // 自动保存进度
    scheduleSaveProgress();
}

/**
 * 清除所有草稿（候选数字）
 */
function clearAllCandidates() {
    const size = currentPuzzle.size || 9;
    // 遍历所有格子
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;

            // 如果是固定数字，跳过
            if (originalPuzzle[index] !== '0') continue;

            // 获取当前格子的值
            const currentValue = currentBoard[index];

            // 如果是候选数组，清空它
            if (Array.isArray(currentValue)) {
                currentBoard[index] = [];
            }
            // 如果是确定值，保持不变
        }
    }

    // 更新显示
    renderBoard();

    // 自动保存进度
    scheduleSaveProgress();
}

/**
 * 获取指定格子的所有候选数字
 * @param {number} row - 行号
 * @param {number} col - 列号
 * @returns {number[]} - 候选数字数组
 */
function getCandidates(row, col) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const usedNumbers = new Set();

    // 获取同行已使用的数字
    for (let c = 0; c < size; c++) {
        const val = currentBoard[row * size + c];
        if (typeof val === 'number' && val !== 0) {
            usedNumbers.add(val);
        }
    }

    // 获取同列已使用的数字
    for (let r = 0; r < size; r++) {
        const val = currentBoard[r * size + col];
        if (typeof val === 'number' && val !== 0) {
            usedNumbers.add(val);
        }
    }

    // 获取同宫已使用的数字（支持标准数独和锯齿数独）
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：遍历不规则宫格中的单元格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const val = currentBoard[r * size + c];
                    if (typeof val === 'number' && val !== 0) {
                        usedNumbers.add(val);
                    }
                }
                break;
            }
        }
    } else {
        // 标准数独：遍历规则宫格中的单元格
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                const val = currentBoard[r * size + c];
                if (typeof val === 'number' && val !== 0) {
                    usedNumbers.add(val);
                }
            }
        }
    }

    // 返回未使用的数字作为候选
    const candidates = [];
    for (let n = 1; n <= size; n++) {
        if (!usedNumbers.has(n)) {
            candidates.push(n);
        }
    }

    return candidates;
}

/**
 * 获取同行中除当前格子外的所有格子索引
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 同行其他格子的索引数组
 */
function getRows(row, col) {
    const size = currentPuzzle.size || 9;
    const excludeIndex = row * size + col;
    const indices = [];
    for (let c = 0; c < size; c++) {
        const idx = row * size + c;
        if (idx !== excludeIndex) indices.push(idx);
    }
    return indices;
}

/**
 * 获取同列中除当前格子外的所有格子索引
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 同列其他格子的索引数组
 */
function getCols(row, col) {
    const size = currentPuzzle.size || 9;
    const excludeIndex = row * size + col;
    const indices = [];
    for (let r = 0; r < size; r++) {
        const idx = r * size + col;
        if (idx !== excludeIndex) indices.push(idx);
    }
    return indices;
}

/**
 * 获取同宫（3x3区域）中除当前格子外的所有格子索引
 * @param {number} row - 当前行号
 * @param {number} col - 当前列号
 * @returns {number[]} - 同宫其他格子的索引数组
 */
function getBoxes(row, col) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const excludeIndex = row * size + col;
    const indices = [];

    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：遍历不规则宫格中的单元格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const idx = r * size + c;
                    if (idx !== excludeIndex) indices.push(idx);
                }
                break;
            }
        }
    } else {
        // 标准数独：遍历规则宫格中的单元格
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const rowStart = Math.floor(row / boxRows) * boxRows;
        const colStart = Math.floor(col / boxCols) * boxCols;
        for (let r = rowStart; r < rowStart + boxRows; r++) {
            for (let c = colStart; c < colStart + boxCols; c++) {
                const idx = r * size + c;
                if (idx !== excludeIndex) indices.push(idx);
            }
        }
    }
    return indices;
}

// ==================== 数独生成器类 ====================
class SudokuGenerator {
    constructor(size = 9, gameTypeStr = 'STANDARD') {
        this.setSize(size);
        this.setGameTypeStr(gameTypeStr);
    }

    /**
     * 设置棋盘尺寸
     * @param {number} size 尺寸（4、6或9）
     */
    setSize(size) {
        this.SIZE = size;
        // 宫格的行列数
        if (size === 4) {
            this.BOX_ROWS = 2;
            this.BOX_COLS = 2;
        } else if (size === 6) {
            this.BOX_ROWS = 2;
            this.BOX_COLS = 3;
        } else {
            this.BOX_ROWS = 3;
            this.BOX_COLS = 3;
        }
        // 可用的数字范围
        this.NUMBERS = [];
        for (let i = 1; i <= size; i++) {
            this.NUMBERS.push(i);
        }
    }

    /**
     * 设置游戏类型
     * @param {string} gameTypeStr 游戏类型（STANDARD, DIAGONAL, ODD_EVEN, KILLER, IRREGULAR）
     */
    setGameTypeStr(gameTypeStr) {
        this.GAME_TYPE_STR = gameTypeStr;
        // 奇偶数独的奇偶标记（true为奇数格，false为偶数格）
        if (gameTypeStr !== 'ODD_EVEN') {
            this.oddEvenMarks = null;
        }
        // 杀手数独的笼子
        this.cages = null;
        // 锯齿数独的不规则宫格
        if (gameTypeStr === 'IRREGULAR') {
            this.irregularBoxes = this.generateIrregularBoxes();
            // 预计算单元格到宫格的映射，提高验证性能
            this.buildCellToBoxMap();
        } else {
            this.irregularBoxes = null;
        }
    }

    /**
     * 生成9x9锯齿数独(Jigsaw Sudoku)不规则宫格定义，随机选择一种布局
     * @returns {number[][][]} 宫格坐标数组 [宫索引][格子索引][行, 列]
     */
    generateIrregularBoxes() {
        // 20套合法不规则宫布局：每套9个宫，每宫9格，全局81格不重不漏
        const LAYOUTS = Object.freeze([
            // 布局 1 - 经典Z字形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4], [3, 2]],
                [[0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4]],
                [[0, 8], [1, 8], [2, 8], [3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 7]],
                [[4, 8], [5, 5], [5, 6], [5, 7], [5, 8], [6, 5], [6, 6], [6, 7], [6, 8]],
                [[4, 0], [4, 1], [5, 0], [5, 1], [6, 0], [6, 1], [6, 2], [7, 0], [7, 1]],
                [[6, 3], [6, 4], [7, 2], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 2 - 波浪形
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [3, 2]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [1, 6], [2, 3], [2, 4], [2, 5], [3, 3]],
                [[0, 7], [0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 4], [3, 5]],
                [[3, 6], [3, 7], [3, 8], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3]],
                [[4, 4], [4, 5], [4, 6], [5, 4], [5, 5], [5, 6], [6, 1], [6, 2], [6, 3]],
                [[4, 7], [4, 8], [5, 7], [5, 8], [6, 4], [6, 5], [6, 6], [7, 4], [7, 5]],
                [[6, 7], [6, 8], [7, 0], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 3 - 阶梯形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [4, 1], [5, 1]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [2, 3], [2, 4], [3, 2], [4, 2], [5, 2]],
                [[0, 7], [0, 8], [1, 6], [1, 7], [2, 5], [2, 6], [3, 3], [4, 3], [5, 3]],
                [[1, 8], [2, 7], [2, 8], [3, 4], [3, 5], [4, 4], [5, 4], [6, 3], [6, 4]],
                [[3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [5, 5], [6, 5], [7, 4], [7, 5]],
                [[4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [7, 0]],
                [[6, 6], [6, 7], [6, 8], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 4 - 块状形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
                [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]],
                [[0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8]],
                [[3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0], [6, 1]],
                [[3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4]],
                [[3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6]],
                [[5, 7], [5, 8], [6, 2], [6, 3], [6, 4], [6, 5], [7, 2], [7, 3], [7, 4]],
                [[6, 6], [6, 7], [6, 8], [7, 0], [7, 1], [7, 5], [7, 6], [8, 5], [8, 6]],
                [[7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 7], [8, 8]]
            ],
            // 布局 5 - 对角线形
            [
                [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 1], [3, 2], [3, 3]],
                [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [2, 5]],
                [[0, 4], [0, 5], [0, 6], [1, 5], [1, 6], [1, 7], [2, 6], [2, 7], [2, 8]],
                [[3, 0], [4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 1], [6, 2], [6, 3]],
                [[0, 7], [0, 8], [1, 8], [3, 4], [3, 5], [3, 6], [4, 2], [4, 3], [4, 4]],
                [[3, 7], [3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 3], [5, 4], [5, 5]],
                [[5, 6], [5, 7], [5, 8], [6, 0], [6, 4], [6, 5], [6, 6], [7, 4], [7, 5]],
                [[6, 7], [6, 8], [7, 0], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 6 - 十字形
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4]],
                [[0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3]],
                [[0, 8], [1, 8], [2, 8], [3, 5], [3, 6], [3, 7], [4, 4], [4, 5], [4, 6]],
                [[3, 8], [4, 7], [4, 8], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [6, 5]],
                [[4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 4], [6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 5], [8, 6], [8, 7]]
            ],
            // 布局 7 - 螺旋形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [2, 2], [2, 3], [3, 1], [3, 2], [4, 1]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [2, 4], [2, 5], [3, 3], [4, 2], [5, 1]],
                [[0, 7], [0, 8], [1, 6], [1, 7], [2, 6], [2, 7], [3, 4], [4, 3], [5, 2]],
                [[1, 8], [2, 8], [3, 5], [3, 6], [3, 7], [4, 4], [5, 3], [6, 2], [6, 3]],
                [[3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 4], [5, 5], [6, 4], [6, 5]],
                [[5, 6], [5, 7], [5, 8], [6, 0], [6, 1], [7, 0], [7, 1], [7, 2], [8, 0]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 1], [8, 2], [8, 3]],
                [[7, 6], [7, 7], [7, 8], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [5, 0]]
            ],
            // 布局 8 - 菱形
            [
                [[0, 4], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
                [[0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 7], [2, 8]],
                [[3, 1], [3, 2], [3, 3], [4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]],
                [[3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 7]],
                [[6, 0], [6, 1], [6, 2], [7, 0], [7, 1], [7, 2], [8, 0], [8, 1], [8, 2]],
                [[6, 3], [6, 4], [6, 5], [6, 6], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4]],
                [[6, 8], [7, 6], [7, 7], [7, 8], [8, 5], [8, 6], [8, 7], [8, 8], [5, 6]]
            ],
            // 布局 9 - 扇形
            [
                [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0]],
                [[0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [3, 1], [4, 1]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [2, 3], [2, 4], [3, 2], [4, 2]],
                [[1, 7], [1, 8], [2, 5], [2, 6], [3, 3], [3, 4], [3, 5], [4, 3], [5, 2]],
                [[2, 7], [2, 8], [3, 6], [3, 7], [3, 8], [4, 4], [4, 5], [5, 3], [5, 4]],
                [[4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [5, 7], [5, 8], [6, 6], [6, 7]],
                [[5, 0], [5, 1], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 4], [6, 5], [6, 8], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 10 - 星型
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]],
                [[0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [3, 1]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [2, 3], [2, 4], [3, 2]],
                [[1, 8], [2, 5], [2, 6], [2, 7], [2, 8], [3, 3], [3, 4], [4, 1], [4, 2]],
                [[3, 5], [3, 6], [3, 7], [3, 8], [4, 3], [4, 4], [4, 5], [5, 1], [5, 2]],
                [[4, 6], [4, 7], [4, 8], [5, 3], [5, 4], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 11 - 平行四边形
            [
                [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 1], [3, 2], [4, 2]],
                [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 3], [3, 4], [4, 3], [4, 4]],
                [[0, 3], [0, 4], [0, 5], [1, 4], [1, 5], [2, 4], [2, 5], [3, 5], [4, 5]],
                [[0, 6], [0, 7], [1, 6], [1, 7], [2, 6], [2, 7], [3, 6], [4, 6], [5, 5]],
                [[0, 8], [1, 8], [2, 8], [3, 7], [3, 8], [4, 7], [4, 8], [5, 6], [5, 7]],
                [[4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [6, 2], [7, 1]],
                [[5, 3], [5, 4], [5, 8], [6, 3], [6, 4], [6, 5], [7, 2], [7, 3], [7, 4]],
                [[6, 6], [6, 7], [6, 8], [7, 5], [7, 6], [7, 7], [8, 4], [8, 5], [8, 6]],
                [[7, 0], [7, 8], [8, 0], [8, 1], [8, 2], [8, 3], [8, 7], [8, 8], [6, 0]]
            ],
            // 布局 12 - 三角形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [4, 1], [5, 1]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [2, 3], [2, 4], [3, 2], [4, 2], [5, 2]],
                [[0, 7], [0, 8], [1, 6], [1, 7], [2, 5], [2, 6], [3, 3], [4, 3], [5, 3]],
                [[1, 8], [2, 7], [2, 8], [3, 4], [3, 5], [4, 4], [4, 5], [5, 4], [6, 3]],
                [[3, 6], [3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [5, 7]],
                [[5, 8], [6, 0], [6, 1], [6, 2], [6, 4], [6, 5], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 13 - 梯形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
                [[0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[1, 8], [2, 8], [3, 2], [3, 3], [3, 4], [4, 0], [4, 1], [4, 2], [5, 0]],
                [[3, 5], [3, 6], [3, 7], [4, 3], [4, 4], [4, 5], [5, 1], [5, 2], [5, 3]],
                [[3, 8], [4, 6], [4, 7], [4, 8], [5, 4], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 14 - 箭头形
            [
                [[0, 4], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [3, 1], [3, 2]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
                [[0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 5], [2, 6]],
                [[2, 7], [2, 8], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [5, 3]],
                [[3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 7], [4, 8], [5, 4], [5, 5]],
                [[4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [6, 2], [7, 0]],
                [[5, 6], [5, 7], [5, 8], [6, 3], [6, 4], [6, 5], [7, 1], [7, 2], [7, 3]],
                [[6, 6], [6, 7], [6, 8], [7, 4], [7, 5], [7, 6], [8, 2], [8, 3], [8, 4]],
                [[7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8], [6, 0]]
            ],
            // 布局 15 - 六边形
            [
                [[0, 4], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [3, 0]],
                [[0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 7], [2, 8]],
                [[3, 1], [3, 2], [3, 3], [4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]],
                [[3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 7]],
                [[6, 0], [6, 1], [6, 2], [7, 0], [7, 1], [7, 2], [8, 0], [8, 1], [8, 2]],
                [[6, 3], [6, 4], [6, 5], [6, 6], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4]],
                [[6, 8], [7, 6], [7, 7], [7, 8], [8, 5], [8, 6], [8, 7], [8, 8], [5, 6]]
            ],
            // 布局 16 - 五边形
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0]],
                [[0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [3, 1], [4, 1]],
                [[0, 5], [0, 6], [1, 5], [1, 6], [2, 4], [2, 5], [3, 2], [4, 2], [5, 1]],
                [[0, 7], [0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [3, 3], [4, 3], [5, 2]],
                [[2, 8], [3, 4], [3, 5], [3, 6], [4, 4], [4, 5], [5, 3], [5, 4], [6, 2]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [6, 3], [6, 4]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 5], [6, 6], [7, 0], [7, 1], [7, 2]],
                [[6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [7, 6], [8, 2], [8, 3], [8, 4]],
                [[7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8], [5, 0]]
            ],
            // 布局 17 - 七边形
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0], [5, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4]],
                [[0, 5], [0, 6], [0, 7], [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7]],
                [[0, 8], [1, 8], [2, 8], [3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [5, 1]],
                [[3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 2], [5, 3], [5, 4]],
                [[3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 18 - 椭圆
            [
                [[0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4]],
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
                [[0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 5], [2, 6], [2, 7]],
                [[2, 2], [2, 8], [3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [5, 2]],
                [[3, 5], [3, 6], [3, 7], [4, 4], [4, 5], [4, 6], [5, 3], [5, 4], [5, 5]],
                [[3, 8], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8], [6, 5], [6, 6], [6, 7]],
                [[4, 0], [5, 0], [5, 1], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1]],
                [[6, 4], [6, 8], [7, 2], [7, 3], [7, 4], [7, 5], [8, 2], [8, 3], [8, 4]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 5], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 19 - 矩形组合
            [
                [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
                [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [2, 3], [2, 4], [2, 5], [3, 4]],
                [[0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [1, 8], [2, 6], [2, 7]],
                [[2, 8], [3, 0], [3, 1], [3, 2], [3, 3], [4, 0], [4, 1], [4, 2], [5, 0]],
                [[3, 5], [3, 6], [3, 7], [3, 8], [4, 3], [4, 4], [4, 5], [5, 1], [5, 2]],
                [[4, 6], [4, 7], [4, 8], [5, 3], [5, 4], [5, 5], [5, 6], [6, 4], [6, 5]],
                [[5, 7], [5, 8], [6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2]],
                [[6, 6], [6, 7], [6, 8], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]],
                [[7, 6], [7, 7], [7, 8], [8, 0], [8, 1], [8, 2], [8, 6], [8, 7], [8, 8]]
            ],
            // 布局 20 - 不规则混合
            [
                [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]],
                [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [3, 2]],
                [[0, 5], [0, 6], [1, 4], [1, 5], [1, 6], [2, 3], [2, 4], [2, 5], [3, 3]],
                [[0, 7], [0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 4], [3, 5]],
                [[3, 6], [3, 7], [3, 8], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3]],
                [[4, 4], [4, 5], [4, 6], [5, 4], [5, 5], [5, 6], [6, 1], [6, 2], [6, 3]],
                [[4, 7], [4, 8], [5, 7], [5, 8], [6, 4], [6, 5], [6, 6], [7, 4], [7, 5]],
                [[6, 7], [6, 8], [7, 0], [7, 1], [7, 2], [7, 3], [8, 0], [8, 1], [8, 2]],
                [[7, 6], [7, 7], [7, 8], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]]
            ]
        ]);

        // 随机选取一套布局
        const randomIdx = Math.floor(Math.random() * LAYOUTS.length);
        const selectLayout = LAYOUTS[randomIdx];

        // 深拷贝：防止外部篡改原始常量数据
        return JSON.parse(JSON.stringify(selectLayout));
    }

    /**
     * 构建单元格到宫格的映射表（优化性能）
     */
    buildCellToBoxMap() {
        if (!this.irregularBoxes) return;
        this.cellToBoxMap = new Map();
        for (let boxIndex = 0; boxIndex < this.irregularBoxes.length; boxIndex++) {
            for (const cell of this.irregularBoxes[boxIndex]) {
                const key = `${cell[0]},${cell[1]}`;
                this.cellToBoxMap.set(key, boxIndex);
            }
        }
    }

    /**
     * 获取指定位置所属的不规则宫格（使用缓存优化）
     * @param {number} row 行
     * @param {number} col 列
     * @returns {number} 宫格索引
     */
    getIrregularBoxIndex(row, col) {
        if (!this.irregularBoxes) return -1;
        // 使用缓存映射
        if (this.cellToBoxMap) {
            const key = `${row},${col}`;
            return this.cellToBoxMap.get(key) ?? -1;
        }
        // 回退到遍历查找
        for (let i = 0; i < this.irregularBoxes.length; i++) {
            if (this.irregularBoxes[i].some(cell => cell[0] === row && cell[1] === col)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 获取当前尺寸
     */
    getSize() {
        return this.SIZE;
    }

    /**
     * 生成完整的数独棋盘
     * @returns {number[][]} 完整数独棋盘
     */
    generateFullBoard() {
        const board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
        this.fillBoard(board, 0, 0);
        return board;
    }

    /**
     * 递归填充数独棋盘
     * @param {number[][]} board 棋盘
     * @param {number} row 当前行
     * @param {number} col 当前列
     * @returns {boolean} 是否成功填充
     */
    fillBoard(board, row, col) {
        if (row === this.SIZE) return true;
        const nextRow = col === this.SIZE - 1 ? row + 1 : row;
        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        // 随机打乱数字顺序
        const nums = this.shuffleArray([...this.NUMBERS]);

        for (const num of nums) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this.fillBoard(board, nextRow, nextCol)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 检查在指定位置填入数字是否有效
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @param {number} num 数字
     * @returns {boolean} 是否有效
     */
    isValid(board, row, col, num) {
        // 检查同行
        for (let c = 0; c < this.SIZE; c++) {
            if (board[row][c] === num) return false;
        }
        // 检查同列
        for (let r = 0; r < this.SIZE; r++) {
            if (board[r][col] === num) return false;
        }
        // 检查宫格（标准或不规则）
        if (this.GAME_TYPE_STR === 'IRREGULAR' && this.irregularBoxes) {
            // 锯齿数独：检查不规则宫格
            const boxIndex = this.getIrregularBoxIndex(row, col);
            if (boxIndex >= 0) {
                for (const cell of this.irregularBoxes[boxIndex]) {
                    const [r, c] = cell;
                    if ((r !== row || c !== col) && board[r][c] === num) {
                        return false;
                    }
                }
            }
        } else {
            // 标准数独：检查规则宫格
            const boxRow = row - row % this.BOX_ROWS;
            const boxCol = col - col % this.BOX_COLS;
            for (let r = boxRow; r < boxRow + this.BOX_ROWS; r++) {
                for (let c = boxCol; c < boxCol + this.BOX_COLS; c++) {
                    if (board[r][c] === num) return false;
                }
            }
        }
        // 对角线数独：检查两条对角线
        if (this.GAME_TYPE_STR === 'DIAGONAL') {
            // 主对角线 (row == col)
            if (row === col) {
                for (let i = 0; i < this.SIZE; i++) {
                    if (i !== row && board[i][i] === num) return false;
                }
            }
            // 副对角线 (row + col == SIZE - 1)
            if (row + col === this.SIZE - 1) {
                for (let i = 0; i < this.SIZE; i++) {
                    const j = this.SIZE - 1 - i;
                    if ((i !== row || j !== col) && board[i][j] === num) return false;
                }
            }
        }
        // 奇偶数独：检查奇偶性
        if (this.GAME_TYPE_STR === 'ODD_EVEN' && this.oddEvenMarks) {
            const isOdd = num % 2 === 1;
            if (this.oddEvenMarks[row][col] !== isOdd) return false;
        }
        // 杀手数独：检查同笼不重复
        if (this.GAME_TYPE_STR === 'KILLER' && this.cages) {
            for (const cage of this.cages) {
                const hasCell = cage.cells.some(cell => cell.row === row && cell.col === col);
                if (hasCell) {
                    for (const cell of cage.cells) {
                        if (cell.row !== row || cell.col !== col) {
                            if (board[cell.row][cell.col] === num) return false;
                        }
                    }
                }
            }
        }
        // 窗口数独：检查四个额外的3x3窗口区域
        if (this.GAME_TYPE_STR === 'WINDOKU') {
            const windokuRegions = [
                // 左上窗口 (行1-3, 列1-3)
                { startRow: 1, endRow: 3, startCol: 1, endCol: 3 },
                // 右上窗口 (行1-3, 列5-7)
                { startRow: 1, endRow: 3, startCol: 5, endCol: 7 },
                // 左下窗口 (行5-7, 列1-3)
                { startRow: 5, endRow: 7, startCol: 1, endCol: 3 },
                // 右下窗口 (行5-7, 列5-7)
                { startRow: 5, endRow: 7, startCol: 5, endCol: 7 }
            ];
            for (const region of windokuRegions) {
                if (row >= region.startRow && row <= region.endRow &&
                    col >= region.startCol && col <= region.endCol) {
                    for (let r = region.startRow; r <= region.endRow; r++) {
                        for (let c = region.startCol; c <= region.endCol; c++) {
                            if ((r !== row || c !== col) && board[r][c] === num) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
        // 三明治数独：检查1和9的位置是否满足提示约束（验证阶段使用）
        if (this.GAME_TYPE_STR === 'SANDWICH' && this.sandwichClues) {
            if (!this.isValidSandwichPlacement(board, row, col, num)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 验证三明治数独中数字放置是否有效
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @param {number} num 数字
     * @returns {boolean} 是否有效
     */
    isValidSandwichPlacement(board, row, col, num) {
        // 复制棋盘并放置新数字
        const testBoard = board.map(r => [...r]);
        testBoard[row][col] = num;

        // 检查行约束
        const rowClue = this.sandwichClues.top[row];
        if (!this.isValidSandwichRow(testBoard, row, rowClue)) {
            return false;
        }

        // 检查列约束
        const colClue = this.sandwichClues.left[col];
        if (!this.isValidSandwichCol(testBoard, col, colClue)) {
            return false;
        }

        return true;
    }

    /**
     * 检查某行是否满足三明治约束
     * @param {number[][]} board 棋盘
     * @param {number} row 行号
     * @param {number} clue 提示数字
     * @returns {boolean} 是否满足约束
     */
    isValidSandwichRow(board, row, clue) {
        const cells = board[row];
        return this.isValidSandwichLine(cells, clue);
    }

    /**
     * 检查某列是否满足三明治约束
     * @param {number[][]} board 棋盘
     * @param {number} col 列号
     * @param {number} clue 提示数字
     * @returns {boolean} 是否满足约束
     */
    isValidSandwichCol(board, col, clue) {
        const cells = [];
        for (let i = 0; i < this.SIZE; i++) {
            cells.push(board[i][col]);
        }
        return this.isValidSandwichLine(cells, clue);
    }

    /**
     * 检查一行/列是否满足三明治约束
     * @param {number[]} line 行/列的数字数组
     * @param {number} clue 提示数字
     * @returns {boolean} 是否满足约束
     */
    isValidSandwichLine(line, clue) {
        const emptyCount = line.filter(n => n === 0).length;

        // 如果该行/列还有空格，暂时跳过验证（只做基本检查）
        if (emptyCount > 0) {
            // 检查是否已经违反明显的约束
            const ones = [];
            const nines = [];

            for (let i = 0; i < line.length; i++) {
                if (line[i] === 1) ones.push(i);
                if (line[i] === 9) nines.push(i);
            }

            // 如果已经有超过1个1或超过1个9，无效
            if (ones.length > 1 || nines.length > 1) {
                return false;
            }

            // 如果1和9都已确定位置，检查约束
            if (ones.length === 1 && nines.length === 1) {
                const onePos = ones[0];
                const ninePos = nines[0];
                const minPos = Math.min(onePos, ninePos);
                const maxPos = Math.max(onePos, ninePos);

                let sum = 0;
                for (let i = minPos + 1; i < maxPos; i++) {
                    if (line[i] !== 0) {
                        sum += line[i];
                    } else {
                        // 如果中间有空格，无法计算，暂时视为有效
                        return true;
                    }
                }

                return sum === clue;
            }

            return true;
        }

        // 该行/列已满，进行完整验证
        const onePos = line.indexOf(1);
        const ninePos = line.indexOf(9);

        // 如果没有1或9，无效
        if (onePos === -1 || ninePos === -1) {
            return false;
        }

        const minPos = Math.min(onePos, ninePos);
        const maxPos = Math.max(onePos, ninePos);

        let sum = 0;
        for (let i = minPos + 1; i < maxPos; i++) {
            sum += line[i];
        }

        return sum === clue;
    }

    /**
     * 计算一行的三明治和（1和9之间的数字之和）
     * @param {number[]} line 行/列的数字数组
     * @returns {number} 三明治和
     */
    calculateSandwichSum(line) {
        const onePos = line.indexOf(1);
        const ninePos = line.indexOf(9);

        if (onePos === -1 || ninePos === -1) {
            return -1; // 未确定
        }

        const minPos = Math.min(onePos, ninePos);
        const maxPos = Math.max(onePos, ninePos);

        let sum = 0;
        for (let i = minPos + 1; i < maxPos; i++) {
            sum += line[i];
        }

        return sum;
    }

    /**
     * 生成三明治数独的完整解
     * @returns {number[][]} 完整数独棋盘
     */
    generateSandwichSolution() {
        console.log('🔷 开始生成三明治数独...');
        const startTime = Date.now();

        this.setGameTypeStr('SANDWICH');
        let board = null;
        const maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // 生成标准数独解
                board = this.generateFullBoard();

                // 计算三明治提示
                const clues = this.generateSandwichClues(board);
                this.sandwichClues = clues;

                console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                break;
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试失败，重试...`);
            }
        }

        if (!board) {
            console.log('⚠️ 三明治数独生成失败，使用标准数独解');
            board = this.generateFullBoard();
            this.sandwichClues = this.generateSandwichClues(board);
        }

        console.log(`✅ 三明治数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 生成三明治数独的外部提示
     * @param {number[][]} board 完整棋盘
     * @returns {object} 包含top, bottom, left, right提示的对象
     */
    generateSandwichClues(board) {
        const clues = {
            top: [],
            bottom: [],
            left: [],
            right: []
        };

        // 计算每行的提示（顶部和底部相同）
        for (let r = 0; r < this.SIZE; r++) {
            const sum = this.calculateSandwichSum(board[r]);
            clues.top.push(sum);
            clues.bottom.push(sum);
        }

        // 计算每列的提示（左侧和右侧相同）
        for (let c = 0; c < this.SIZE; c++) {
            const col = [];
            for (let r = 0; r < this.SIZE; r++) {
                col.push(board[r][c]);
            }
            const sum = this.calculateSandwichSum(col);
            clues.left.push(sum);
            clues.right.push(sum);
        }

        return clues;
    }

    /**
     * 创建数独题目（移除部分数字）
     * @param {number[][]} fullBoard 完整棋盘
     * @param {number} emptyCount 空格数量
     * @returns {number[][]} 数独题目
     */
    createPuzzle(fullBoard, emptyCount) {
        // 深拷贝棋盘
        let bestPuzzle = fullBoard.map(row => [...row]);
        let bestEmpty = 0;

        // 尝试多轮，每轮使用不同的随机顺序
        const attempts = this.SIZE <= 6 ? 10 : 3;

        for (let attempt = 0; attempt < attempts; attempt++) {
            const puzzle = fullBoard.map(row => [...row]);

            // 生成所有位置并随机打乱
            const positions = [];
            for (let i = 0; i < this.SIZE; i++) {
                for (let j = 0; j < this.SIZE; j++) {
                    positions.push([i, j]);
                }
            }
            this.shuffleArray(positions);

            let empty = 0;
            for (const [r, c] of positions) {
                if (empty >= emptyCount) break;
                if (puzzle[r][c] === 0) continue;

                const temp = puzzle[r][c];
                puzzle[r][c] = 0;

                // 确保只有唯一解
                if (this.getSolutionCount(puzzle) === 1) {
                    empty++;
                } else {
                    puzzle[r][c] = temp;
                }
            }

            // 记录最佳结果
            if (empty > bestEmpty) {
                bestEmpty = empty;
                bestPuzzle = puzzle.map(row => [...row]);
            }

            // 如果达到目标，直接返回
            if (empty >= emptyCount) {
                return puzzle;
            }
        }

        // 如果多次尝试都达不到目标，返回最佳结果
        return bestPuzzle;
    }

    /**
     * 计算解的数量
     * @param {number[][]} board 棋盘
     * @returns {number} 解的数量
     */
    getSolutionCount(board) {
        this.solutionCount = 0;
        const copy = board.map(row => [...row]);
        this.countSolve(copy, 0, 0);
        return this.solutionCount;
    }

    /**
     * 递归计算解的数量
     */
    countSolve(board, row, col) {
        if (this.solutionCount >= 2) return;
        if (row === this.SIZE) {
            this.solutionCount++;
            return;
        }
        const nextRow = col === this.SIZE - 1 ? row + 1 : row;
        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        if (board[row][col] !== 0) {
            this.countSolve(board, nextRow, nextCol);
            return;
        }

        for (const num of this.NUMBERS) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                this.countSolve(board, nextRow, nextCol);
                board[row][col] = 0;
            }
        }
    }

    /**
     * 随机打乱数组
     * @param {Array} array 数组
     * @returns {Array} 打乱后的数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * 棋盘转字符串
     * @param {number[][]} board 棋盘
     * @returns {string} 字符串
     */
    boardToString(board) {
        return board.flat().join('');
    }

    /**
     * 生成奇偶数独的奇偶标记
     * @returns {boolean[][]} 奇偶标记矩阵（true为奇数格，false为偶数格）
     */
    generateOddEvenMarks() {
        const marks = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(false));

        // 使用棋盘格模式：(r + c) % 2 === 0 的格子为奇数格
        // 这样每行、每列都恰好有5个奇数格和4个偶数格
        // 每个宫格也恰好有5个奇数格和4个偶数格
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                marks[r][c] = (r + c) % 2 === 0;
            }
        }

        this.oddEvenMarks = marks;
        return marks;
    }

    /**
     * 生成符合奇偶标记的完整数独解
     * @returns {number[][]} 符合奇偶标记的完整数独棋盘
     */
    generateOddEvenBoard() {
        if (!this.oddEvenMarks) {
            this.generateOddEvenMarks();
        }

        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
            if (this.fillOddEvenBoard(board, 0, 0)) {
                return board;
            }
            attempts++;
        }

        // 如果多次尝试失败，返回空棋盘
        console.warn('奇偶数独生成失败');
        return Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
    }

    /**
     * 递归填充奇偶数独棋盘
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @returns {boolean} 是否成功填充
     */
    fillOddEvenBoard(board, row, col) {
        if (row === this.SIZE) return true;
        if (col === this.SIZE) return this.fillOddEvenBoard(board, row + 1, 0);

        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        // 根据奇偶标记筛选可用数字
        const requiredOdd = this.oddEvenMarks[row][col];
        const nums = this.shuffleArray([...this.NUMBERS]).filter(num => (num % 2 === 1) === requiredOdd);

        for (const num of nums) {
            // 直接检查行、列、宫格（不检查奇偶性，因为我们已经筛选过了）
            if (this.isValidBasic(board, row, col, num)) {
                board[row][col] = num;
                if (this.fillOddEvenBoard(board, row, nextCol)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 基本有效性检查（仅检查行、列、宫格）
     * @param {number[][]} board 棋盘
     * @param {number} row 行
     * @param {number} col 列
     * @param {number} num 数字
     * @returns {boolean} 是否有效
     */
    isValidBasic(board, row, col, num) {
        // 检查同行
        for (let c = 0; c < this.SIZE; c++) {
            if (board[row][c] === num) return false;
        }
        // 检查同列
        for (let r = 0; r < this.SIZE; r++) {
            if (board[r][col] === num) return false;
        }
        // 检查宫格
        const boxRow = row - row % this.BOX_ROWS;
        const boxCol = col - col % this.BOX_COLS;
        for (let r = boxRow; r < boxRow + this.BOX_ROWS; r++) {
            for (let c = boxCol; c < boxCol + this.BOX_COLS; c++) {
                if (board[r][c] === num) return false;
            }
        }
        return true;
    }

    /**
     * 生成奇偶数独的另一种方法：先生成数独解，再根据解生成标记
     * @returns {object} 包含完整棋盘和奇偶标记
     */
    generateOddEvenPuzzle() {
        // 先生成一个标准数独解
        const solution = this.generateFullBoard();

        // 根据解生成奇偶标记
        const marks = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(false));
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                marks[r][c] = solution[r][c] % 2 === 1;
            }
        }

        return { solution, marks };
    }

    /**
     * 杀手数独专用：校验笼子内数字不重复
     */
    isValidKillerCage(board, row, col, num, cages) {
        const currentCage = cages.find(cage =>
            cage.cells.some(cell => cell.row === row && cell.col === col)
        );
        if (!currentCage) return true;
        return !currentCage.cells.some(cell => board[cell.row][cell.col] === num);
    }

    /**
     * 生成【唯一解】杀手数独（对外核心方法）
     * @returns {number[][]} 完整棋盘
     */
    generateKillerSolution() {
        this.setGameTypeStr('KILLER');
        let solution = null;

        // 根据棋盘大小设置提示数比例
        let hintRatio = 0;
        if (this.SIZE === 4) {
            hintRatio = 0; // 4x4: 无提示数
        } else if (this.SIZE === 6) {
            hintRatio = 0.2; // 6x6: 20%提示数
        } else if (this.SIZE === 9) {
            hintRatio = 0.3; // 9x9: 30%提示数
        }

        let attempt = 0;
        // 根据棋盘大小调整尝试次数：9x9复杂度高，尝试次数少一些
        const maxAttempt = 200;

        while (attempt < maxAttempt) {
            attempt++;
            // 1. 生成标准数独解
            solution = this.generateFullBoard();
            // 2. 生成合规笼子（连通、大小2-3格、无重叠）
            this.cages = this.generateValidCages(solution);
            // 3. 创建带提示数的谜题
            const puzzleBoard = this.createKillerPuzzleWithHints(solution, hintRatio);
            this.puzzleBoard = puzzleBoard;

            // 4. 使用带提示数的谜题验证唯一解（提示数大大减少搜索空间）
            if (this.checkKillerUniqueSolutionWithHints()) {
                console.log(`✅ 第${attempt}次尝试：找到唯一解杀手数独`);
                return solution;
            }
        }

        console.log('⚠️ 达到最大尝试次数，返回当前解');
        return solution || this.generateFullBoard();
    }

    /**
     * 生成锯齿数独完整解（高性能 安全 不卡死）
     */
    generateIrregularSolution() {
        console.log('🔷 开始生成锯齿数独...');
        const startTime = Date.now();
        this.setGameTypeStr('IRREGULAR');

        let board = null;
        const maxAttempts = 8; // 尝试8套布局

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // 换新布局
                this.irregularBoxes = this.generateIrregularBoxes();
                this.buildCellToBoxMap();

                // 安全生成（200ms 强制超时）
                board = this.generateFullBoardSafe();

                if (board && this.isFilledAndValidBoard(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 布局无解，更换...`);
            }
        }

        // 🔥 最后兜底：生成一个【100%合法】的锯齿解（不会破坏规则）
        if (!board || !this.isFilledAndValidBoard(board)) {
            console.log('⚠️ 使用合法兜底棋盘');
            board = this.generateValidJigsawBoard();
        }

        console.log(`✅ 生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 生成窗口数独（Windoku）解
     * 窗口数独规则：除标准数独规则外，四个额外的3x3窗口区域也必须包含1-9各一次
     * @returns {number[][]} 完整棋盘
     */
    generateWindokuSolution() {
        console.log('🔷 开始生成窗口数独...');
        const startTime = Date.now();
        this.setGameTypeStr('WINDOKU');

        let board = null;
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateFullBoardSafe();
                if (board && this.isFilledAndValidBoard(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试超时，重试...`);
            }
        }

        // 兜底：如果生成失败，使用标准数独解
        if (!board || !this.isFilledAndValidBoard(board)) {
            console.log('⚠️ 窗口数独生成失败，使用标准数独解');
            this.setGameTypeStr('STANDARD');
            board = this.generateFullBoard();
            this.setGameTypeStr('WINDOKU');
        }

        console.log(`✅ 窗口数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 生成中心点数独解
     */
    generateCenterDotSolution() {
        console.log('🔷 开始生成中心点数独...');
        const startTime = Date.now();
        this.setGameTypeStr('CENTER_DOT');

        let board = null;
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateCenterDotBoardSafe();
                if (board && this.isCenterDotValid(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试超时，重试...`);
            }
        }

        // 兜底：如果生成失败，使用标准数独解
        if (!board || !this.isCenterDotValid(board)) {
            console.log('⚠️ 中心点数独生成失败，使用标准数独解');
            this.setGameTypeStr('STANDARD');
            board = this.generateFullBoard();
            this.setGameTypeStr('CENTER_DOT');
        }

        console.log(`✅ 中心点数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 安全生成中心点数独（带超时）
     */
    generateCenterDotBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillCenterDotBoardWithTimeout(board, 0, 0, Date.now(), 1000) ? board : null;
    }

    /**
     * 递归填充中心点数独（带超时保护）
     */
    fillCenterDotBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nx = col === 8 ? row + 1 : row;
        const ny = col === 8 ? 0 : col + 1;
        if (board[row][col] !== 0) return this.fillCenterDotBoardWithTimeout(board, nx, ny, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            if (this.isValidCenterDot(board, row, col, n)) {
                board[row][col] = n;
                if (this.fillCenterDotBoardWithTimeout(board, nx, ny, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 验证中心点数独位置
     */
    isValidCenterDot(board, r, c, num) {
        // 标准数独验证
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        // 中心点区域验证
        if (this.isCenterCell(r, c)) {
            for (const [cr, cc] of this.getCenterCells()) {
                if (board[cr][cc] === num) return false;
            }
        }

        return true;
    }

    /**
     * 判断是否是中心单元格
     */
    isCenterCell(r, c) {
        return (r % 3 === 1) && (c % 3 === 1);
    }

    /**
     * 获取所有中心单元格位置
     */
    getCenterCells() {
        const centers = [];
        for (let i = 0; i < 9; i += 3) {
            for (let j = 0; j < 9; j += 3) {
                centers.push([i + 1, j + 1]);
            }
        }
        return centers;
    }

    /**
     * 验证完整的中心点数独
     */
    isCenterDotValid(board) {
        if (!this.isFilledAndValidBoard(board)) return false;

        // 验证中心点区域
        const centerValues = [];
        for (const [r, c] of this.getCenterCells()) {
            centerValues.push(board[r][c]);
        }

        const unique = [...new Set(centerValues)];
        return unique.length === 9 && unique.every(v => v >= 1 && v <= 9);
    }

    /**
     * 生成星号数独解
     */
    generateStarSolution() {
        console.log('🔷 开始生成星号数独...');
        const startTime = Date.now();
        this.setGameTypeStr('STAR');

        let board = null;
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateStarBoardSafe();
                if (board && this.isStarValid(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试超时，重试...`);
            }
        }

        // 兜底：如果生成失败，使用标准数独解
        if (!board || !this.isStarValid(board)) {
            console.log('⚠️ 星号数独生成失败，使用标准数独解');
            this.setGameTypeStr('STANDARD');
            board = this.generateFullBoard();
            this.setGameTypeStr('STAR');
        }

        console.log(`✅ 星号数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return board;
    }

    /**
     * 安全生成星号数独（带超时）
     */
    generateStarBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillStarBoardWithTimeout(board, 0, 0, Date.now(), 1000) ? board : null;
    }

    /**
     * 递归填充星号数独（带超时保护）
     */
    fillStarBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nx = col === 8 ? row + 1 : row;
        const ny = col === 8 ? 0 : col + 1;
        if (board[row][col] !== 0) return this.fillStarBoardWithTimeout(board, nx, ny, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            if (this.isValidStar(board, row, col, n)) {
                board[row][col] = n;
                if (this.fillStarBoardWithTimeout(board, nx, ny, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 验证星号数独位置
     */
    isValidStar(board, r, c, num) {
        // 标准数独验证
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        // 星号区域验证
        if (this.isStarCell(r, c)) {
            for (const [sr, sc] of this.getStarCells()) {
                if (board[sr][sc] === num) return false;
            }
        }

        return true;
    }

    /**
     * 判断是否是星号单元格
     */
    isStarCell(r, c) {
        const starCells = this.getStarCells();
        return starCells.some(([sr, sc]) => sr === r && sc === c);
    }

    /**
     * 获取所有星号单元格位置（星形图案）
     * 形成X形状的星号图案
     */
    getStarCells() {
        return [
            [1, 4],  // 第二行第五列
            [2, 2],  // 第三行第三列
            [2, 6],  // 第三行第七列
            [4, 1],  // 第五行第二列
            [4, 4],  // 第五行第五列
            [4, 7],  // 第五行第八列
            [6, 2],  // 第七行第三列
            [6, 6],  // 第七行第七列
            [7, 4]   // 第八行第五列
        ];
    }

    /**
     * 验证完整的星号数独
     */
    isStarValid(board) {
        if (!this.isFilledAndValidBoard(board)) return false;

        // 验证星号区域
        const starValues = [];
        for (const [r, c] of this.getStarCells()) {
            starValues.push(board[r][c]);
        }

        const unique = [...new Set(starValues)];
        return unique.length === 9 && unique.every(v => v >= 1 && v <= 9);
    }

    /**
     * 生成黑白点数独解
     */
    generateBlackWhiteDotSolution() {
        console.log('🔷 开始生成黑白点数独...');
        const startTime = Date.now();
        this.setGameTypeStr('BLACK_WHITE_DOT');

        let board = null;
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                board = this.generateFullBoard();
                if (board && this.isValidBlackWhiteDot(board)) {
                    console.log(`✅ 第 ${attempt + 1} 次尝试成功`);
                    break;
                }
            } catch (e) {
                console.log(`🔄 第 ${attempt + 1} 次尝试失败，重试...`);
            }
        }

        if (!board) {
            console.log('⚠️ 黑白点数独生成失败，使用标准数独解');
            board = this.generateFullBoard();
        }

        // 计算黑白点提示
        const dots = this.generateBlackWhiteDotHints(board);

        console.log(`✅ 黑白点数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return { board, dots };
    }

    /**
     * 验证黑白点数独解（检查是否满足负约束）
     */
    isValidBlackWhiteDot(board) {
        if (!this.isFilledAndValidBoard(board)) return false;

        // 检查所有相邻单元格
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = board[r][c];

                // 检查右边相邻
                if (c < 8) {
                    const rightVal = board[r][c + 1];
                    if (this.hasRelation(val, rightVal)) {
                        // 如果有连续或两倍关系但不是1-2，需要标记
                        // 对于生成来说，任何关系都是允许的，负约束是在解题时检查
                    }
                }

                // 检查下边相邻
                if (r < 8) {
                    const downVal = board[r + 1][c];
                    if (this.hasRelation(val, downVal)) {
                        // 同上
                    }
                }
            }
        }

        return true;
    }

    /**
     * 判断两个数是否有关系（连续或两倍）
     */
    hasRelation(a, b) {
        return Math.abs(a - b) === 1 || Math.max(a, b) === 2 * Math.min(a, b);
    }

    /**
     * 判断两个数应该标记为什么类型的点
     * 返回: 'white' (差为1), 'black' (两倍), 'either' (1和2), null (无关系)
     */
    getDotType(a, b) {
        if (Math.abs(a - b) === 1) {
            if ((a === 1 && b === 2) || (a === 2 && b === 1)) {
                return 'either'; // 1和2可以是任意颜色
            }
            return 'white';
        }
        if (Math.max(a, b) === 2 * Math.min(a, b)) {
            return 'black';
        }
        return null;
    }

    /**
     * 生成黑白点提示
     */
    generateBlackWhiteDotHints(board) {
        const dots = [];

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = board[r][c];

                // 检查右边相邻
                if (c < 8) {
                    const rightVal = board[r][c + 1];
                    const dotType = this.getDotType(val, rightVal);
                    if (dotType === 'either') {
                        // 1和2之间选择白点（更常见）
                        dots.push({ row: r, col: c, direction: 'right', type: 'white' });
                    } else if (dotType) {
                        dots.push({ row: r, col: c, direction: 'right', type: dotType });
                    }
                }

                // 检查下边相邻
                if (r < 8) {
                    const downVal = board[r + 1][c];
                    const dotType = this.getDotType(val, downVal);
                    if (dotType === 'either') {
                        dots.push({ row: r, col: c, direction: 'down', type: 'white' });
                    } else if (dotType) {
                        dots.push({ row: r, col: c, direction: 'down', type: dotType });
                    }
                }
            }
        }

        return dots;
    }

    /**
     * 生成摩天楼数独解
     */
    generateSkyscraperSolution() {
        console.log('🔷 开始生成摩天楼数独...');
        const startTime = Date.now();
        this.setGameTypeStr('SKYSCRAPER');

        // 生成标准数独解
        const board = this.generateFullBoard();

        // 计算摩天楼提示
        const clues = this.generateSkyscraperClues(board);

        console.log(`✅ 摩天楼数独生成完成，耗时: ${Date.now() - startTime}ms`);
        return { board, clues };
    }

    /**
     * 计算摩天楼提示
     * 返回: { top: [], bottom: [], left: [], right: [] }
     */
    generateSkyscraperClues(board) {
        const clues = {
            top: [],  // 第一个为空，用于对齐
            bottom: [],
            left: [],
            right: []
        };

        // 计算每行的左右提示
        for (let r = 0; r < 9; r++) {
            clues.left.push(this.countVisibleBuildings(board[r]));
            clues.right.push(this.countVisibleBuildings([...board[r]].reverse()));
        }
        // 最后添加一个空元素
        // clues.left.push(null);
        // clues.right.push(null);

        // 计算每列的上下提示
        for (let c = 0; c < 9; c++) {
            const col = [];
            for (let r = 0; r < 9; r++) {
                col.push(board[r][c]);
            }
            clues.top.push(this.countVisibleBuildings(col));
            clues.bottom.push(this.countVisibleBuildings([...col].reverse()));
        }
        // 最后添加一个空元素
        // clues.top.push(null);
        // clues.bottom.push(null);

        return clues;
    }

    /**
     * 计算从某个方向可以看到的建筑物数量
     */
    countVisibleBuildings(arr) {
        let count = 0;
        let maxHeight = 0;

        for (const height of arr) {
            if (height > maxHeight) {
                count++;
                maxHeight = height;
            }
        }

        return count;
    }

    /**
     * 安全生成（带超时）
     */
    generateFullBoardSafe() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));
        return this.fillBoardWithTimeout(board, 0, 0, Date.now(), 1000) ? board : null;
    }

    /**
     * 递归 + 超时保护（绝不卡死）
     */
    fillBoardWithTimeout(board, row, col, start, maxMs) {
        if (Date.now() - start > maxMs) throw new Error('timeout');
        if (row === 9) return true;

        const nx = col === 8 ? row + 1 : row;
        const ny = col === 8 ? 0 : col + 1;
        if (board[row][col] !== 0) return this.fillBoardWithTimeout(board, nx, ny, start, maxMs);

        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            // 根据游戏类型选择合适的验证方法
            let isValid;
            if (this.GAME_TYPE_STR === 'IRREGULAR') {
                isValid = this.isValidJigsaw(board, row, col, n);
            } else {
                isValid = this.isValid(board, row, col, n);
            }
            if (isValid) {
                board[row][col] = n;
                if (this.fillBoardWithTimeout(board, nx, ny, start, maxMs)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * 锯齿数独专用校验（超快）
     */
    isValidJigsaw(board, r, c, num) {
        for (let i = 0; i < 9; i++) if (board[r][i] === num) return false;
        for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;

        const box = this.cellToBoxMap.get(`${r},${c}`);
        for (const [x, y] of this.irregularBoxes[box]) {
            if (board[x][y] === num) return false;
        }
        return true;
    }

    /**
     * 🔥 合法兜底棋盘（100% 满足当前锯齿布局）
     */
    generateValidJigsawBoard() {
        const board = Array(9).fill(0).map(() => Array(9).fill(0));

        // 按不规则宫填充，保证宫内数字 1-9
        this.irregularBoxes.forEach(box => {
            const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            box.forEach(([r, c], idx) => {
                board[r][c] = nums[idx];
            });
        });

        return board;
    }

    /**
     * 构建单元格→宫索引映射（O(1) 访问）
     */
    buildCellToBoxMap() {
        this.cellToBoxMap = new Map();
        this.irregularBoxes.forEach((box, idx) => {
            box.forEach(([r, c]) => {
                this.cellToBoxMap.set(`${r},${c}`, idx);
            });
        });
    }

    /**
     * 检查是否填满 + 全局合法
     */
    isFilledAndValidBoard(board) {
        if (!board) return false;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) return false;
                const val = board[r][c];
                board[r][c] = 0;
                // 根据游戏类型选择合适的验证方法
                let ok;
                if (this.GAME_TYPE_STR === 'IRREGULAR') {
                    ok = this.isValidJigsaw(board, r, c, val);
                } else {
                    ok = this.isValid(board, r, c, val);
                }
                board[r][c] = val;
                if (!ok) return false;
            }
        }
        return true;
    }

    /**
     * 洗牌
     */
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }



    /**
     * 创建带提示数的杀手数独谜题
     * @param {number[][]} solution 完整解
     * @param {number} hintRatio 提示数比例（0-1）
     */
    createKillerPuzzleWithHints(solution, hintRatio = 0.3) {
        const puzzle = solution.map(row => [...row]);
        const totalCells = this.SIZE * this.SIZE;
        const hintCount = Math.floor(totalCells * hintRatio);
        const positions = [];

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                positions.push({ row: r, col: c });
            }
        }

        this.shuffleArray(positions);

        const keepPositions = new Set();
        for (let i = 0; i < hintCount; i++) {
            const pos = positions[i];
            keepPositions.add(`${pos.row}-${pos.col}`);
        }

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (!keepPositions.has(`${r}-${c}`)) {
                    puzzle[r][c] = 0;
                }
            }
        }

        return puzzle;
    }

    /**
     * 生成合规笼子（连通、大小2-4格、无重叠、相邻）
     */
    generateValidCages(board) {
        const used = Array(this.SIZE).fill(false).map(() => Array(this.SIZE).fill(false));
        const cages = [];
        // 笼子大小：2-3格（降低难度，避免多解）
        const CAGE_MIN_SIZE = 2;
        const CAGE_MAX_SIZE = 4; // 统一最大4格，降低难度

        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (used[r][c]) continue;
                const cage = this.createCage(r, c, used, board, CAGE_MIN_SIZE, CAGE_MAX_SIZE);
                cages.push(cage);
            }
        }
        return cages;
    }

    /**
     * 创建单个连通笼子
     */
    createCage(startR, startC, used, board, minSize, maxSize) {
        const cells = [{ row: startR, col: startC }];
        used[startR][startC] = true;
        const targetSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));

        // 扩展相邻格子
        while (cells.length < targetSize) {
            const neighbors = [];
            for (const cell of cells) {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = cell.row + dr;
                    const nc = cell.col + dc;
                    if (nr >= 0 && nr < this.SIZE && nc >= 0 && nc < this.SIZE && !used[nr][nc]) {
                        neighbors.push({ row: nr, col: nc });
                    }
                }
            }
            if (neighbors.length === 0) break;
            const add = neighbors[Math.floor(Math.random() * neighbors.length)];
            cells.push(add);
            used[add.row][add.col] = true;
        }

        // 计算笼子和
        const sum = cells.reduce((s, cell) => s + board[cell.row][cell.col], 0);
        return { cells, sum };
    }

    /**
     * 【极速验证】杀手数独是否唯一解（核心优化）
     */
    checkKillerUniqueSolution() {
        this.solutionCount = 0;
        const emptyBoard = Array(this.SIZE).fill(0).map(() => Array(this.SIZE).fill(0));
        this.backtrackKiller(emptyBoard, this.cages, 0, 0);
        return this.solutionCount === 1;
    }

    /**
     * 使用带提示数的谜题验证唯一解（大大减少搜索空间）
     */
    checkKillerUniqueSolutionWithHints() {
        this.solutionCount = 0;
        // 使用带提示数的谜题作为起点
        const startBoard = this.puzzleBoard.map(row => [...row]);
        this.backtrackKiller(startBoard, this.cages, 0, 0);
        return this.solutionCount === 1;
    }

    /**
     * 杀手数独回溯求解（超强剪枝，速度提升10倍+）
     */
    backtrackKiller(board, cages, row, col) {
        // 找到2个解直接终止
        if (this.solutionCount >= 2) return;
        // 填满棋盘 = 找到解
        if (row === this.SIZE) {
            this.solutionCount++;
            return;
        }

        const nextRow = col === this.SIZE - 1 ? row + 1 : row;
        const nextCol = col === this.SIZE - 1 ? 0 : col + 1;

        // 已填数字直接跳过
        if (board[row][col] !== 0) {
            this.backtrackKiller(board, cages, nextRow, nextCol);
            return;
        }

        // 获取当前笼子
        const cage = cages.find(c =>
            c.cells.some(cell => cell.row === row && cell.col === col)
        );

        // 笼子预计算：已填和、已用数字、剩余格子
        let filledSum = 0, filledCnt = 0;
        const usedNums = new Set();
        if (cage) {
            for (const cell of cage.cells) {
                const v = board[cell.row][cell.col];
                if (v !== 0) {
                    filledSum += v;
                    filledCnt++;
                    usedNums.add(v);
                }
            }
        }
        const remainSum = cage ? cage.sum - filledSum : 0;
        const remainCnt = cage ? cage.cells.length - filledCnt : 0;

        // 尝试所有合法数字
        for (const num of this.NUMBERS) {
            // 1. 笼子内已用数字
            if (usedNums.has(num)) continue;
            // 2. 基础数独规则
            if (!this.isValid(board, row, col, num)) continue;
            // 3. 笼子和剪枝（剩余数字不可能满足和要求，直接跳过）
            if (cage) {
                const minRemain = remainCnt - 1;
                const maxRemain = (remainCnt - 1) * this.SIZE;
                if (num + minRemain > remainSum || num + maxRemain < remainSum) continue;
            }

            // 填写数字
            board[row][col] = num;
            this.backtrackKiller(board, cages, nextRow, nextCol);
            board[row][col] = 0;

            // 提前终止
            if (this.solutionCount >= 2) return;
        }
    }

}

// 创建数独生成器实例
const sudokuGenerator = new SudokuGenerator();

// ==================== 本地存储管理 ====================
const Storage = {
    KEYS: {
        RECORDS: 'sudoku_records',
        SCORE_RECORDS: 'sudoku_score_records',
        SESSION: 'sudoku_session',
        PUZZLE_ID: 'sudoku_puzzle_id',
        PLAYER_DATA: 'sudoku_player_data',
        WEEKLY_TASKS: 'sudoku_weekly_tasks',
        DAILY_TASKS: 'sudoku_daily_tasks'
    },

    /**
     * 获取用户会话ID
     */
    getSessionId() {
        let sessionId = localStorage.getItem(this.KEYS.SESSION);
        if (!sessionId) {
            sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.KEYS.SESSION, sessionId);
        }
        return sessionId;
    },

    /**
     * 获取所有记录
     */
    getRecords() {
        const data = localStorage.getItem(this.KEYS.RECORDS);
        return data ? JSON.parse(data) : [];
    },

    /**
     * 保存记录
     */
    saveRecord(record) {
        const records = this.getRecords();
        const index = records.findIndex(r => r.puzzleId === record.puzzleId);
        if (index >= 0) {
            records[index] = record;
        } else {
            records.push(record);
        }
        localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(records));
    },

    /**
     * 获取指定题目的记录
     */
    getRecord(puzzleId) {
        const records = this.getRecords();
        // 转换为数字类型进行比较，避免 localStorage 存储导致的类型不匹配
        const puzzleIdNum = typeof puzzleId === 'string' ? parseInt(puzzleId, 10) : puzzleId;
        return records.find(r => r.puzzleId === puzzleIdNum);
    },

    /**
     * 获取所有积分记录
     */
    getScoreRecords() {
        const data = localStorage.getItem(this.KEYS.SCORE_RECORDS);
        return data ? JSON.parse(data) : [];
    },

    /**
     * 保存积分记录
     */
    saveScoreRecord(record) {
        const scoreRecords = this.getScoreRecords();
        record.id = Date.now() + Math.random().toString(36).substr(2, 9);
        record.timestamp = new Date().toISOString();
        scoreRecords.push(record);
        localStorage.setItem(this.KEYS.SCORE_RECORDS, JSON.stringify(scoreRecords));
        return record;
    },

    /**
     * 获取每日任务
     */
    getDailyTasks() {
        const data = localStorage.getItem(this.KEYS.DAILY_TASKS);
        if (data) {
            const tasks = JSON.parse(data);
            // 检查任务数据版本（处理旧数据）
            if (!tasks.version || tasks.version < 2) {
                return this.resetDailyTasks();
            }
            // 检查是否需要重置（新的一天）
            if (tasks.lastRefreshDate) {
                const lastDate = new Date(tasks.lastRefreshDate).toDateString();
                const today = new Date().toDateString();
                if (lastDate !== today) {
                    return this.resetDailyTasks();
                }
            }
            return tasks;
        }
        return this.resetDailyTasks();
    },

    /**
     * 重置每日任务
     */
    resetDailyTasks() {
        const playerData = this.getPlayerData();
        const dailyTasks = generateDailyTasks(playerData.level);
        dailyTasks.lastRefreshDate = new Date().toISOString();
        localStorage.setItem(this.KEYS.DAILY_TASKS, JSON.stringify(dailyTasks));
        return dailyTasks;
    },

    /**
     * 保存每日任务
     */
    saveDailyTasks(tasks) {
        tasks.lastRefreshDate = tasks.lastRefreshDate || new Date().toISOString();
        localStorage.setItem(this.KEYS.DAILY_TASKS, JSON.stringify(tasks));
    },

    /**
     * 获取下一个题目ID
     */
    getNextPuzzleId() {
        let id = parseInt(localStorage.getItem(this.KEYS.PUZZLE_ID) || '0');
        id++;
        localStorage.setItem(this.KEYS.PUZZLE_ID, id.toString());
        return id;
    },

    /**
     * 简单加密函数（XOR加密）
     */
    encrypt(data, key = 'sudoku_secret_key') {
        // 先编码以处理非ASCII字符
        const encodedData = encodeURIComponent(data);
        let encrypted = [];
        for (let i = 0; i < encodedData.length; i++) {
            encrypted.push(encodedData.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(String.fromCharCode(...encrypted));
    },

    /**
     * 简单解密函数
     */
    decrypt(encrypted, key = 'sudoku_secret_key') {
        try {
            const decoded = atob(encrypted);
            let decrypted = [];
            for (let i = 0; i < decoded.length; i++) {
                decrypted.push(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            // 解码还原非ASCII字符
            return decodeURIComponent(String.fromCharCode(...decrypted));
        } catch {
            return null;
        }
    },

    /**
     * 导出存档 - 将所有数据打包成加密字符串
     */
    exportSaveData() {
        const playerData = this.getPlayerData();
        const records = this.getRecords();
        const scoreRecords = this.getScoreRecords();
        
        // 使用紧凑格式减少体积
        const compactData = {
            v: '1',
            t: Date.now(),
            p: {
                s: playerData.totalScore,
                l: playerData.level,
                d: playerData.continueDay,
                a: playerData.achievementList,
                lp: playerData.lastPlayDate
            },
            r: records.slice(-50), // 只保留最近50条记录
            sr: scoreRecords.slice(-30), // 只保留最近30条积分记录
            sid: localStorage.getItem(this.KEYS.SESSION),
            pid: localStorage.getItem(this.KEYS.PUZZLE_ID),
            dt: this.getDailyTasks(),
            wt: this.getWeeklyTasks()
        };
        const jsonString = JSON.stringify(compactData);
        return this.compressAndEncrypt(jsonString);
    },

    /**
     * 压缩并加密数据
     */
    compressAndEncrypt(data) {
        // 使用简单的字符替换压缩
        let compressed = data
            .replace(/"([a-z])":/g, '$1:')
            .replace(/":/g, '=')
            .replace(/"([^"]+)"/g, '`$1`');
        
        // 编码处理非ASCII字符
        const encoded = encodeURIComponent(compressed);
        
        // XOR加密
        const key = 'sudoku_key';
        let encrypted = [];
        for (let i = 0; i < encoded.length; i++) {
            encrypted.push(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        
        // 使用base64url编码（更紧凑）
        return btoa(String.fromCharCode(...encrypted))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    },

    /**
     * 解密并解压数据
     */
    decryptAndDecompress(encrypted) {
        try {
            // 还原base64url编码
            const base64 = encrypted
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
            
            // XOR解密
            const decoded = atob(padded);
            const key = 'sudoku_key';
            let decrypted = [];
            for (let i = 0; i < decoded.length; i++) {
                decrypted.push(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            
            // 解码还原
            const decompressed = decodeURIComponent(String.fromCharCode(...decrypted));
            
            // 还原JSON格式
            const restored = decompressed
                .replace(/`([^`]+)`/g, '"$1"')
                .replace(/=/g, '":')
                .replace(/([a-z]):/g, '"$1":');
            
            return JSON.parse(restored);
        } catch {
            return null;
        }
    },

    /**
     * 导入存档 - 解析加密字符串并恢复数据
     */
    importSaveData(encryptedData) {
        try {
            // 尝试新格式
            let saveData = this.decryptAndDecompress(encryptedData);
            
            // 如果新格式失败，尝试旧格式（兼容之前的存档）
            if (!saveData) {
                const jsonString = this.decrypt(encryptedData);
                if (!jsonString) {
                    return { success: false, message: '无效的存档数据' };
                }
                saveData = JSON.parse(jsonString);
            }
            
            // 验证版本
            if (!saveData.v && !saveData.version) {
                return { success: false, message: '无效的存档数据' };
            }
            
            // 恢复数据（兼容新旧格式）
            const playerData = saveData.p || saveData.data?.playerData;
            if (playerData) {
                // 转换紧凑格式
                const fullPlayerData = {
                    totalScore: playerData.s || playerData.totalScore || 0,
                    level: playerData.l || playerData.level || 1,
                    continueDay: playerData.d || playerData.continueDay || 0,
                    achievementList: playerData.a || playerData.achievementList || [],
                    lastPlayDate: playerData.lp || playerData.lastPlayDate || null
                };
                this.savePlayerData(fullPlayerData);
            }
            
            const records = saveData.r || saveData.data?.records;
            if (records) {
                localStorage.setItem(this.KEYS.RECORDS, JSON.stringify(records));
            }
            
            const scoreRecords = saveData.sr || saveData.data?.scoreRecords;
            if (scoreRecords) {
                localStorage.setItem(this.KEYS.SCORE_RECORDS, JSON.stringify(scoreRecords));
            }
            
            const session = saveData.sid || saveData.data?.session;
            if (session) {
                localStorage.setItem(this.KEYS.SESSION, session);
            }
            
            const puzzleId = saveData.pid || saveData.data?.puzzleId;
            if (puzzleId) {
                localStorage.setItem(this.KEYS.PUZZLE_ID, puzzleId);
            }
            
            const dailyTasks = saveData.dt || saveData.data?.dailyTasks;
            if (dailyTasks) {
                localStorage.setItem(this.KEYS.DAILY_TASKS, JSON.stringify(dailyTasks));
            }
            
            const weeklyTasks = saveData.wt || saveData.data?.weeklyTasks;
            if (weeklyTasks) {
                localStorage.setItem(this.KEYS.WEEKLY_TASKS, JSON.stringify(weeklyTasks));
            }
            
            // 获取导出时间
            const exportTime = saveData.t ? new Date(saveData.t).toISOString() : saveData.exportTime || new Date().toISOString();
            
            return { 
                success: true, 
                message: '存档导入成功',
                exportTime: exportTime 
            };
        } catch (error) {
            return { success: false, message: '存档解析失败: ' + error.message };
        }
    },

    /**
     * 清除所有存档数据
     */
    clearAllData() {
        localStorage.removeItem(this.KEYS.RECORDS);
        localStorage.removeItem(this.KEYS.SCORE_RECORDS);
        localStorage.removeItem(this.KEYS.SESSION);
        localStorage.removeItem(this.KEYS.PUZZLE_ID);
        localStorage.removeItem(this.KEYS.PLAYER_DATA);
        localStorage.removeItem(this.KEYS.DAILY_TASKS);
        localStorage.removeItem(this.KEYS.WEEKLY_TASKS);
    },

    /**
     * 获取玩家数据
     */
    getPlayerData() {
        const data = localStorage.getItem(this.KEYS.PLAYER_DATA);
        if (data) {
            return JSON.parse(data);
        }
        // 返回默认值
        return {
            totalScore: 0,
            level: 1,
            continueDay: 0,
            achievementList: [],
            lastPlayDate: null
        };
    },

    /**
     * 保存玩家数据
     */
    savePlayerData(data) {
        localStorage.setItem(this.KEYS.PLAYER_DATA, JSON.stringify(data));
    },

    /**
     * 获取周常任务
     */
    getWeeklyTasks() {
        const data = localStorage.getItem(this.KEYS.WEEKLY_TASKS);
        if (data) {
            const tasks = JSON.parse(data);
            // 检查是否需要刷新（每周一0点）
            if (this.needsRefreshWeeklyTasks(tasks.lastRefreshDate)) {
                return this.resetWeeklyTasks();
            }
            return tasks;
        }
        return this.resetWeeklyTasks();
    },

    /**
     * 保存周常任务
     */
    saveWeeklyTasks(tasks) {
        localStorage.setItem(this.KEYS.WEEKLY_TASKS, JSON.stringify(tasks));
    },

    /**
     * 检查是否需要刷新周常任务
     */
    needsRefreshWeeklyTasks(lastRefreshDate) {
        if (!lastRefreshDate) return true;
        const lastDate = new Date(lastRefreshDate);
        const now = new Date();
        // 获取上周一0点
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - (now.getDay() || 7) + 1);
        lastMonday.setHours(0, 0, 0, 0);
        return lastDate < lastMonday;
    },

    /**
     * 重置周常任务
     */
    resetWeeklyTasks() {
        const tasks = {
            lastRefreshDate: new Date().toISOString(),
            dailyQuiz: { progress: 0, target: 5, reward: 10, completed: false },
            challengeAdvanced: { progress: 0, target: 3, reward: 25, completed: false },
            hardcoreChallenge: { progress: 0, target: 2, reward: 40, completed: false }
        };
        this.saveWeeklyTasks(tasks);
        return tasks;
    }
};

// ==================== 每日任务系统 ====================

// 每日任务模板配置（按等级分组）
const dailyTaskTemplates = {
    // Lv1-3: 新手阶段
    beginner: [
        { id: 'daily_easy', name: '新手热身', description: '完成1道简单难度数独', type: 'game', target: 1, reward: 3, filter: { difficulty: 'EASY' } },
        { id: 'daily_mini', name: '迷你挑战', description: '完成1道迷你数独', type: 'game', target: 1, reward: 2, filter: { gameType: ['MINI_4x4', 'MINI_6x6'] } },
        { id: 'daily_quick', name: '快速通关', description: '5分钟内完成1道数独', type: 'time', target: 1, timeLimit: 300, reward: 5, filter: {} },
        { id: 'daily_streak', name: '保持连胜', description: '连续完成2道数独', type: 'streak', target: 2, reward: 4, filter: {} },
        { id: 'daily_first', name: '每日首胜', description: '完成今日第一道数独', type: 'first', target: 1, reward: 5, filter: {} }
    ],
    // Lv4-6: 进阶阶段
    intermediate: [
        { id: 'daily_medium', name: '进阶挑战', description: '完成2道中等难度数独', type: 'game', target: 2, reward: 8, filter: { difficulty: 'MEDIUM' } },
        { id: 'daily_standard', name: '标准练习', description: '完成3道标准数独', type: 'game', target: 3, reward: 6, filter: { gameType: 'STANDARD' } },
        { id: 'daily_speed', name: '速度挑战', description: '3分钟内完成1道数独', type: 'time', target: 1, timeLimit: 180, reward: 8, filter: {} },
        { id: 'daily_no_mistake', name: '完美通关', description: '无错误完成1道数独', type: 'perfect', target: 1, reward: 10, filter: {} },
        { id: 'daily_variant', name: '初尝变体', description: '完成1道变体数独', type: 'game', target: 1, reward: 10, filter: { gameType: ['DIAGONAL', 'ODD_EVEN'] } }
    ],
    // Lv7-9: 高手阶段
    advanced: [
        { id: 'daily_hard', name: '高手试炼', description: '完成2道高级难度数独', type: 'game', target: 2, reward: 15, filter: { difficulty: 'HARD' } },
        { id: 'daily_killer', name: '杀手挑战', description: '完成1道杀手数独', type: 'game', target: 1, reward: 12, filter: { gameType: ['KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9'] } },
        { id: 'daily_master', name: '大师速度', description: '2分钟内完成1道数独', type: 'time', target: 1, timeLimit: 120, reward: 15, filter: {} },
        { id: 'daily_streak_5', name: '连胜大师', description: '连续完成5道数独', type: 'streak', target: 5, reward: 12, filter: {} },
        { id: 'daily_variant_2', name: '变体达人', description: '完成2道不同类型变体数独', type: 'game', target: 2, reward: 15, filter: { gameType: ['DIAGONAL', 'ODD_EVEN', 'IRREGULAR', 'WINDOKU'] } }
    ],
    // Lv10+: 大师阶段
    master: [
        { id: 'daily_hardcore', name: '硬核挑战', description: '完成3道高级难度数独', type: 'game', target: 3, reward: 25, filter: { difficulty: 'HARD' } },
        { id: 'daily_killer_9x9', name: '终极杀手', description: '完成1道9宫杀手数独', type: 'game', target: 1, reward: 20, filter: { gameType: 'KILLER_9x9' } },
        { id: 'daily_speed_demon', name: '极速通关', description: '1分钟内完成1道标准数独', type: 'time', target: 1, timeLimit: 60, reward: 20, filter: { gameType: 'STANDARD' } },
        { id: 'daily_perfect_streak', name: '完美连胜', description: '连续5道无错误通关', type: 'perfect_streak', target: 5, reward: 25, filter: {} },
        { id: 'daily_all_variant', name: '变体全制霸', description: '完成3道不同类型变体数独', type: 'game', target: 3, reward: 30, filter: { gameType: ['DIAGONAL', 'ODD_EVEN', 'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 'SANDWICH', 'SKYSCRAPER'] } }
    ]
};

/**
 * 根据等级获取每日任务组
 */
function getTaskGroup(level) {
    if (level <= 3) return 'beginner';
    if (level <= 6) return 'intermediate';
    if (level <= 9) return 'advanced';
    return 'master';
}

/**
 * 生成每日任务
 */
function generateDailyTasks(level) {
    const taskGroup = getTaskGroup(level);
    const templates = dailyTaskTemplates[taskGroup];
    
    const tasks = {
        version: 2  // 任务数据版本号，用于强制更新旧数据
    };
    templates.forEach(template => {
        tasks[template.id] = {
            ...template,
            progress: 0,
            completed: false,
            claimed: false
        };
    });
    
    return tasks;
}

/**
 * 更新每日任务
 */
function updateDailyTasks(gameType, difficulty, completionTime, attemptCount) {
    const tasks = Storage.getDailyTasks();
    let totalReward = 0;
    const completedTasks = [];
    
    Object.keys(tasks).forEach(taskId => {
        const task = tasks[taskId];
        if (task.completed || task.claimed || taskId === 'lastRefreshDate' || taskId === 'version') return;
        
        let shouldProgress = false;
        
        switch (task.type) {
            case 'game':
                if (task.filter.difficulty) {
                    shouldProgress = difficulty === task.filter.difficulty;
                } else if (task.filter.gameType) {
                    const gameTypes = Array.isArray(task.filter.gameType) ? task.filter.gameType : [task.filter.gameType];
                    shouldProgress = gameTypes.includes(gameType);
                } else {
                    shouldProgress = true;
                }
                break;
            case 'time':
                // 速度挑战：单次通关时间小于等于时间限制即完成
                shouldProgress = completionTime <= task.timeLimit;
                break;
            case 'perfect':
                shouldProgress = attemptCount === 1;
                break;
            case 'first':
                // 检查是否是今日第一个完成的任务（通过游戏记录判断）
                const gameRecords = Storage.getRecords();
                const today = new Date().toDateString();
                const todayCompletedRecords = gameRecords.filter(r => r.isCompleted && !r.isAbandoned && 
                    new Date(r.startTime || 0).toDateString() === today);
                shouldProgress = todayCompletedRecords.length === 1;
                break;
            case 'streak':
                // 检查连续完成记录（从最新记录开始检查连续完成）
                const streakRecords = Storage.getRecords();
                const sortedRecords = [...streakRecords].sort((a, b) => 
                    new Date(b.startTime || 0) - new Date(a.startTime || 0)
                );
                
                let currentStreak = 0;
                for (const record of sortedRecords) {
                    if (record.isCompleted && !record.isAbandoned) {
                        currentStreak++;
                    } else {
                        break; // 遇到未完成或放弃的记录，连胜中断
                    }
                    if (currentStreak >= task.target) {
                        break;
                    }
                }
                // 每次完成游戏都更新连胜进度（即使未达到目标）
                shouldProgress = currentStreak > 0;
                break;
            case 'perfect_streak':
                // 检查连续完美通关记录
                const perfectStreakRecords = Storage.getRecords();
                const sortedPerfectRecords = [...perfectStreakRecords].sort((a, b) => 
                    new Date(b.startTime || 0) - new Date(a.startTime || 0)
                );
                
                let perfectStreak = 0;
                for (const record of sortedPerfectRecords) {
                    if (record.isCompleted && !record.isAbandoned && record.attemptCount === 1) {
                        perfectStreak++;
                    } else {
                        break; // 遇到不完美或未完成的记录，连胜中断
                    }
                    if (perfectStreak >= task.target) {
                        break;
                    }
                }
                // 每次完成游戏都更新完美连胜进度（即使未达到目标）
                shouldProgress = perfectStreak > 0;
                break;
        }
        
        if (shouldProgress) {
            if (task.type === 'time' || task.type === 'first') {
                // 这些任务类型：满足条件直接完成
                task.progress = task.target;
                task.completed = true;
                totalReward += task.reward;
                completedTasks.push(task);
            } else if (task.type === 'streak' || task.type === 'perfect_streak') {
                // 连胜任务：更新当前连胜数作为进度
                const streakRecords = Storage.getRecords();
                const sortedStreakRecords = [...streakRecords].sort((a, b) => 
                    new Date(b.startTime || 0) - new Date(a.startTime || 0)
                );
                
                let currentStreak = 0;
                for (const record of sortedStreakRecords) {
                    if (task.type === 'perfect_streak') {
                        if (record.isCompleted && !record.isAbandoned && record.attemptCount === 1) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    } else {
                        if (record.isCompleted && !record.isAbandoned) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                }
                
                task.progress = Math.min(currentStreak, task.target);
                if (task.progress >= task.target) {
                    task.completed = true;
                    totalReward += task.reward;
                    completedTasks.push(task);
                }
            } else {
                task.progress++;
                if (task.progress >= task.target) {
                    task.completed = true;
                    totalReward += task.reward;
                    completedTasks.push(task);
                }
            }
        }
    });
    
    Storage.saveDailyTasks(tasks);
    
    if (totalReward > 0) {
        addScore(totalReward);
        completedTasks.forEach(task => {
            Storage.saveScoreRecord({
                type: 'task',
                name: task.name,
                description: task.description,
                score: task.reward
            });
        });
    }
    
    return { tasks, reward: totalReward, completedTasks };
}

// ==================== 等级成长激励系统 ====================

// 基础分数配置（分/题）
const scoreConfig = {
    MINI_4x4: { EASY: 1, MEDIUM: 2, HARD: 3 },
    MINI_6x6: { EASY: 1, MEDIUM: 2, HARD: 3 },
    STANDARD: { EASY: 2, MEDIUM: 3, HARD: 4 },
    DIAGONAL: { EASY: 2, MEDIUM: 3, HARD: 4 },
    ODD_EVEN: { EASY: 2, MEDIUM: 3, HARD: 4 },
    KILLER_4x4: { EASY: 2, MEDIUM: 3, HARD: 4 },
    KILLER_6x6: { EASY: 2, MEDIUM: 3, HARD: 4 },
    KILLER_9x9: { EASY: 2, MEDIUM: 4, HARD: 6 },
    IRREGULAR: { EASY: 2, MEDIUM: 4, HARD: 6 },
    WINDOKU: { EASY: 2, MEDIUM: 4, HARD: 6 },
    CENTER_DOT: { EASY: 2, MEDIUM: 4, HARD: 6 },
    STAR: { EASY: 2, MEDIUM: 4, HARD: 6 },
    BLACK_WHITE_DOT: { EASY: 2, MEDIUM: 4, HARD: 6 },
    SANDWICH: { EASY: 2, MEDIUM: 4, HARD: 6 },
    SKYSCRAPER: { EASY: 2, MEDIUM: 4, HARD: 6 }
};

// 等级配置
const levelConfig = [
    { level: 1, name: '初学萌新', minScore: 0, title: '萌新' },
    { level: 2, name: '初学萌新', minScore: 15, title: '萌新' },
    { level: 3, name: '初学萌新', minScore: 40, title: '萌新' },
    { level: 4, name: '数独爱好者', minScore: 80, title: '爱好者' },
    { level: 5, name: '数独爱好者', minScore: 140, title: '爱好者' },
    { level: 6, name: '数独爱好者', minScore: 220, title: '爱好者' },
    { level: 7, name: '资深高手', minScore: 330, title: '高手' },
    { level: 8, name: '资深高手', minScore: 470, title: '高手' },
    { level: 9, name: '资深高手', minScore: 650, title: '高手' },
    { level: 10, name: '数独大师', minScore: 880, title: '大师' },
    { level: 11, name: '数独大师', minScore: 1160, title: '大师' },
    { level: 12, name: '数独大师', minScore: 1500, title: '大师' },
    { level: 13, name: '传世宗师', minScore: 1900, title: '宗师' },
    { level: 14, name: '传世宗师', minScore: 2380, title: '宗师' },
    { level: 15, name: '封神宗师', minScore: 2950, title: '宗师' }
];

// 成就配置
const achievementConfig = window.achievementConfig = [
    { id: 'ACH001', name: '新手启程', reward: 10, condition: '通关50道入门题' },
    { id: 'ACH002', name: '持之以恒', reward: 30, condition: '连续14天每日≥1通关' },
    { id: 'ACH003', name: '速通达人', reward: 20, condition: '高级难度2分钟内通关' },
    { id: 'ACH004', name: '变体先锋', reward: 25, condition: '首次通关变体数独' },
    { id: 'ACH005', name: '小有成就', reward: 25, condition: '累计通关100道题' },
    { id: 'ACH006', name: '百题斩', reward: 50, condition: '累计通关500道题' },
    { id: 'ACH007', name: '千题大师', reward: 150, condition: '累计通关1000道题' },
    { id: 'ACH008', name: '初遇挑战', reward: 20, condition: '首次通关高级难度' },
    { id: 'ACH009', name: '迎难而上', reward: 50, condition: '累计通关20道高级难度' },
    { id: 'ACH010', name: '速度之星', reward: 30, condition: '高级难度45秒内通关' },
    { id: 'ACH011', name: '完美主义', reward: 50, condition: '高级难度标准数独无重置90秒内通关' },
    { id: 'ACH012', name: '连胜王者', reward: 35, condition: '连续通关10次' },
    { id: 'ACH013', name: '变体大师', reward: 80, condition: '通关所有类型变体数独' },
    { id: 'ACH014', name: '杀手专家', reward: 50, condition: '通关所有难度杀手数独' },
    { id: 'ACH015', name: '挑战极限', reward: 100, condition: '通关所有类型数独' },
    { id: 'ACH016', name: '打卡达人', reward: 40, condition: '连续21天打卡' },
    { id: 'ACH017', name: '签到王者', reward: 80, condition: '连续60天打卡' },
    { id: 'ACH018', name: '初见杀手', reward: 20, condition: '首次通关杀手数独' },
    { id: 'ACH019', name: '对角线达人', reward: 20, condition: '首次通关对角线数独' },
    { id: 'ACH020', name: '迷你专家', reward: 15, condition: '通关所有迷你数独' },
    { id: 'ACH021', name: '极速大师', reward: 80, condition: '高级难度30秒内通关' },
    { id: 'ACH022', name: '千锤百炼', reward: 300, condition: '累计通关5000道题' },
    { id: 'ACH023', name: '无尽连胜', reward: 60, condition: '连续通关20次' },
    { id: 'ACH024', name: '全能大师', reward: 500, condition: '解锁所有成就' },
    { id: 'ACH025', name: '限时挑战', reward: 40, condition: '10分钟内完成3道高级数独' },
    { id: 'ACH026', name: '完美连胜', reward: 50, condition: '连续10次无重置通关' },
    { id: 'ACH027', name: '夜行大师', reward: 30, condition: '凌晨0-6点完成5次通关' },
    { id: 'ACH028', name: '数字艺术家', reward: 45, condition: '使用颜色模式完成100题' },
    { id: 'ACH029', name: '杀手之王', reward: 60, condition: '通关9宫杀手数独' },
    { id: 'ACH030', name: '传奇大师', reward: 200, condition: '累计通关10000道题' }
];

/**
 * 获取题目基础分数
 */
function getBaseScore(gameType, difficulty) {
    const gameConfig = scoreConfig[gameType];
    if (!gameConfig) return 1;
    return gameConfig[difficulty] || 1;
}

/**
 * 根据分数获取等级信息
 */
function getLevelInfo(score) {
    for (let i = levelConfig.length - 1; i >= 0; i--) {
        if (score >= levelConfig[i].minScore) {
            return levelConfig[i];
        }
    }
    return levelConfig[0];
}

/**
 * 计算升级所需分数
 */
function getScoreToNextLevel(currentLevel) {
    const currentLevelInfo = levelConfig.find(l => l.level === currentLevel);
    const nextLevelInfo = levelConfig.find(l => l.level === currentLevel + 1);
    if (!nextLevelInfo) return null; // 已达到最高等级
    return nextLevelInfo.minScore - currentLevelInfo.minScore;
}

/**
 * 添加分数
 */
function addScore(points) {
    const playerData = Storage.getPlayerData();
    playerData.totalScore += points;
    
    // 更新等级
    const newLevelInfo = getLevelInfo(playerData.totalScore);
    const oldLevel = playerData.level;
    playerData.level = newLevelInfo.level;
    
    Storage.savePlayerData(playerData);
    
    // 如果升级了，返回升级信息
    if (playerData.level > oldLevel) {
        return { levelUp: true, oldLevel, newLevel: playerData.level, levelName: newLevelInfo.name };
    }
    return { levelUp: false };
}

/**
 * 检查并触发成就
 */
function checkAchievements(gameType, difficulty, completionTime) {
    const records = Storage.getRecords();
    const completedRecords = records.filter(r => r.isCompleted && !r.isAbandoned);
    const achievements = [];
    const totalCompleted = completedRecords.length;
    
    let playerData = Storage.getPlayerData();
    
    // ACH001: 新手启程 - 通关50道入门题
    if (!playerData.achievementList.includes('ACH001')) {
        const easyCount = completedRecords.filter(r => 
            ['MINI_4x4', 'MINI_6x6', 'STANDARD'].includes(r.gameType) && 
            r.difficultyType === 'EASY'
        ).length;
        if (easyCount >= 50) {
            achievements.push('ACH001');
            addScore(10);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '新手启程',
                description: '通关50道入门题',
                score: 10
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH003: 速通达人 - 高级难度2分钟内通关
    if (!playerData.achievementList.includes('ACH003')) {
        if (gameType === 'STANDARD' && currentDifficulty === 'HARD' && completionTime < 120) {
            achievements.push('ACH003');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '速通达人',
                description: '高级难度2分钟内通关',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH004: 变体先锋 - 首次通关变体数独
    if (!playerData.achievementList.includes('ACH004')) {
        const variantTypes = ['DIAGONAL', 'ODD_EVEN', 'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 
                             'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
                             'SANDWICH', 'SKYSCRAPER'];
        const hasVariantCompleted = completedRecords.some(r => variantTypes.includes(r.gameType));
        if (hasVariantCompleted) {
            achievements.push('ACH004');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '变体先锋',
                description: '首次通关变体数独',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH005: 小有成就 - 累计通关100道题
    if (!playerData.achievementList.includes('ACH005')) {
        if (totalCompleted >= 100) {
            achievements.push('ACH005');
            addScore(25);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '小有成就',
                description: '累计通关100道题',
                score: 25
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH006: 百题斩 - 累计通关500道题
    if (!playerData.achievementList.includes('ACH006')) {
        if (totalCompleted >= 500) {
            achievements.push('ACH006');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '百题斩',
                description: '累计通关500道题',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH007: 千题大师 - 累计通关1000道题
    if (!playerData.achievementList.includes('ACH007')) {
        if (totalCompleted >= 1000) {
            achievements.push('ACH007');
            addScore(150);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '千题大师',
                description: '累计通关1000道题',
                score: 150
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH008: 初遇挑战 - 首次通关高级难度
    if (!playerData.achievementList.includes('ACH008')) {
        const hasHardCompleted = completedRecords.some(r => r.difficultyType === 'HARD');
        if (hasHardCompleted) {
            achievements.push('ACH008');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '初遇挑战',
                description: '首次通关高级难度',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH009: 迎难而上 - 累计通关20道高级难度
    if (!playerData.achievementList.includes('ACH009')) {
        const hardCount = completedRecords.filter(r => r.difficultyType === 'HARD').length;
        if (hardCount >= 20) {
            achievements.push('ACH009');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '迎难而上',
                description: '累计通关20道高级难度',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH010: 速度之星 - 高级难度45秒内通关
    if (!playerData.achievementList.includes('ACH010')) {
        if (gameType === 'STANDARD' && currentDifficulty === 'HARD' && completionTime < 45) {
            achievements.push('ACH010');
            addScore(30);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '速度之星',
                description: '高级难度45秒内通关',
                score: 30
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH011: 完美主义 - 高级难度无重置90秒内通关
    if (!playerData.achievementList.includes('ACH011')) {
        const hasPerfectCompleted = completedRecords.some(r => 
            r.attemptCount === 0 &&                              // 从未重置
            r.gameType === 'STANDARD' &&                         // 标准9宫格
            r.difficultyType === 'HARD' &&                       // 高级难度
            r.completionTime && r.completionTime <= 90           // 90秒内完成
        );
        if (hasPerfectCompleted) {
            achievements.push('ACH011');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '完美主义',
                description: '高级难度标准数独无重置90秒内通关',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH012: 连胜王者 - 连续通关10次
    if (!playerData.achievementList.includes('ACH012')) {
        const recentRecords = [...completedRecords].sort((a, b) => 
            new Date(b.startTime || 0) - new Date(a.startTime || 0)
        ).slice(0, 10);
        if (recentRecords.length >= 10) {
            achievements.push('ACH012');
            addScore(35);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '连胜王者',
                description: '连续通关10次',
                score: 35
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH013: 变体大师 - 通关所有类型变体数独
    if (!playerData.achievementList.includes('ACH013')) {
        const variantTypes = ['DIAGONAL', 'ODD_EVEN', 'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 
                             'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
                             'SANDWICH', 'SKYSCRAPER'];
        const completedVariantTypes = [...new Set(completedRecords.filter(r => 
            variantTypes.includes(r.gameType)).map(r => r.gameType))];
        if (completedVariantTypes.length >= variantTypes.length) {
            achievements.push('ACH013');
            addScore(80);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '变体大师',
                description: '通关所有类型变体数独',
                score: 80
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH014: 杀手专家 - 通关所有难度杀手数独
    if (!playerData.achievementList.includes('ACH014')) {
        const killerTypes = ['KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9'];
        const completedKillerTypes = [...new Set(completedRecords.filter(r => 
            killerTypes.includes(r.gameType)).map(r => r.gameType))];
        if (completedKillerTypes.length >= killerTypes.length) {
            achievements.push('ACH014');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '杀手专家',
                description: '通关所有难度杀手数独',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH015: 挑战极限 - 通关所有类型数独
    if (!playerData.achievementList.includes('ACH015')) {
        const allGameTypes = ['MINI_4x4', 'MINI_6x6', 'STANDARD', 'DIAGONAL', 'ODD_EVEN', 
                             'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 'IRREGULAR', 
                             'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
                             'SANDWICH', 'SKYSCRAPER'];
        const completedTypes = [...new Set(completedRecords.map(r => r.gameType))];
        if (completedTypes.length >= allGameTypes.length) {
            achievements.push('ACH015');
            addScore(100);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '挑战极限',
                description: '通关所有类型数独',
                score: 100
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH018: 初见杀手 - 首次通关杀手数独
    if (!playerData.achievementList.includes('ACH018')) {
        const killerTypes = ['KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9'];
        const hasKillerCompleted = completedRecords.some(r => killerTypes.includes(r.gameType));
        if (hasKillerCompleted) {
            achievements.push('ACH018');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '初见杀手',
                description: '首次通关杀手数独',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH019: 对角线达人 - 首次通关对角线数独
    if (!playerData.achievementList.includes('ACH019')) {
        const hasDiagonalCompleted = completedRecords.some(r => r.gameType === 'DIAGONAL');
        if (hasDiagonalCompleted) {
            achievements.push('ACH019');
            addScore(20);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '对角线达人',
                description: '首次通关对角线数独',
                score: 20
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH020: 迷你专家 - 通关所有迷你数独
    if (!playerData.achievementList.includes('ACH020')) {
        const miniTypes = ['MINI_4x4', 'MINI_6x6'];
        const completedMiniTypes = [...new Set(completedRecords.filter(r => 
            miniTypes.includes(r.gameType)).map(r => r.gameType))];
        if (completedMiniTypes.length >= miniTypes.length) {
            achievements.push('ACH020');
            addScore(15);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '迷你专家',
                description: '通关所有迷你数独',
                score: 15
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH021: 极速大师 - 高级难度30秒内通关
    if (!playerData.achievementList.includes('ACH021')) {
        if (gameType === 'STANDARD' && currentDifficulty === 'HARD' && completionTime < 30) {
            achievements.push('ACH021');
            addScore(80);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '极速大师',
                description: '高级难度30秒内通关',
                score: 80
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH022: 千锤百炼 - 累计通关5000道题
    if (!playerData.achievementList.includes('ACH022')) {
        if (totalCompleted >= 5000) {
            achievements.push('ACH022');
            addScore(300);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '千锤百炼',
                description: '累计通关5000道题',
                score: 300
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH023: 无尽连胜 - 连续通关20次
    if (!playerData.achievementList.includes('ACH023')) {
        const recentRecords = [...completedRecords].sort((a, b) => 
            new Date(b.startTime || 0) - new Date(a.startTime || 0)
        ).slice(0, 20);
        if (recentRecords.length >= 20) {
            achievements.push('ACH023');
            addScore(60);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '无尽连胜',
                description: '连续通关20次',
                score: 60
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH024: 全能大师 - 解锁所有成就
    if (!playerData.achievementList.includes('ACH024')) {
        if (playerData.achievementList.length >= achievementConfig.length) {
            achievements.push('ACH024');
            addScore(500);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '全能大师',
                description: '解锁所有成就',
                score: 500
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH025: 限时挑战 - 10分钟内完成3道高级数独
    if (!playerData.achievementList.includes('ACH025')) {
        const recentHardRecords = [...completedRecords]
            .filter(r => r.difficultyType === 'HARD' && r.completionTime)
            .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
            .slice(0, 3);
        if (recentHardRecords.length >= 3) {
            const firstTime = new Date(recentHardRecords[2].startTime || 0).getTime();
            const lastTime = new Date(recentHardRecords[0].startTime || 0).getTime() + 
                           (recentHardRecords[0].completionTime || 0) * 1000;
            if ((lastTime - firstTime) / 1000 <= 600) {
                achievements.push('ACH025');
                addScore(40);
                Storage.saveScoreRecord({
                    type: 'achievement',
                    name: '限时挑战',
                    description: '10分钟内完成3道高级数独',
                    score: 40
                });
                playerData = Storage.getPlayerData();
            }
        }
    }
    
    // ACH026: 完美连胜 - 连续10次无重置通关
    if (!playerData.achievementList.includes('ACH026')) {
        const recentRecords = [...completedRecords]
            .filter(r => r.attemptCount === 0)
            .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
            .slice(0, 10);
        if (recentRecords.length >= 10) {
            achievements.push('ACH026');
            addScore(50);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '完美连胜',
                description: '连续10次无重置通关',
                score: 50
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH027: 夜行大师 - 凌晨0-6点完成5次通关
    if (!playerData.achievementList.includes('ACH027')) {
        const nightRecords = completedRecords.filter(r => {
            const hour = new Date(r.startTime || 0).getHours();
            return hour >= 0 && hour < 6;
        });
        if (nightRecords.length >= 5) {
            achievements.push('ACH027');
            addScore(30);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '夜行大师',
                description: '凌晨0-6点完成5次通关',
                score: 30
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH028: 数字艺术家 - 使用颜色模式完成100题
    if (!playerData.achievementList.includes('ACH028')) {
        const colorRecords = completedRecords.filter(r => r.iconMode === 'colors');
        if (colorRecords.length >= 100) {
            achievements.push('ACH028');
            addScore(45);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '数字艺术家',
                description: '使用颜色模式完成100题',
                score: 45
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH029: 杀手之王 - 通关9宫杀手数独
    if (!playerData.achievementList.includes('ACH029')) {
        const hasKiller9x9 = completedRecords.some(r => r.gameType === 'KILLER_9x9');
        if (hasKiller9x9) {
            achievements.push('ACH029');
            addScore(60);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '杀手之王',
                description: '通关9宫杀手数独',
                score: 60
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // ACH030: 传奇大师 - 累计通关10000道题
    if (!playerData.achievementList.includes('ACH030')) {
        if (totalCompleted >= 10000) {
            achievements.push('ACH030');
            addScore(200);
            Storage.saveScoreRecord({
                type: 'achievement',
                name: '传奇大师',
                description: '累计通关10000道题',
                score: 200
            });
            playerData = Storage.getPlayerData();
        }
    }
    
    // 更新成就列表
    if (achievements.length > 0) {
        playerData = Storage.getPlayerData(); // 确保使用最新数据
        playerData.achievementList = [...new Set([...playerData.achievementList, ...achievements])];
        Storage.savePlayerData(playerData);
    }
    
    return achievements.map(id => achievementConfig.find(a => a.id === id));
}

/**
 * 更新连续打卡天数
 */
function updateContinueDay() {
    let playerData = Storage.getPlayerData();
    const today = new Date().toDateString();
    
    if (playerData.lastPlayDate === today) {
        // 今天已经更新过了
        return playerData.continueDay;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (playerData.lastPlayDate === yesterday.toDateString()) {
        // 连续打卡
        playerData.continueDay++;
    } else if (playerData.lastPlayDate) {
        // 断签，重置
        playerData.continueDay = 1;
    } else {
        // 第一次打卡
        playerData.continueDay = 1;
    }
    
    playerData.lastPlayDate = today;
    Storage.savePlayerData(playerData);
    
    const unlockedAchievements = [];
    
    // 检查 ACH002: 持之以恒 - 连续7天打卡
    if (!playerData.achievementList.includes('ACH002') && playerData.continueDay >= 7) {
        playerData = Storage.getPlayerData();
        playerData.achievementList.push('ACH002');
        Storage.savePlayerData(playerData);
        addScore(15);
        Storage.saveScoreRecord({
            type: 'achievement',
            name: '持之以恒',
            description: '连续7天打卡',
            score: 15
        });
        unlockedAchievements.push('ACH002');
        playerData = Storage.getPlayerData();
    }
    
    // 检查 ACH016: 打卡达人 - 连续14天打卡
    if (!playerData.achievementList.includes('ACH016') && playerData.continueDay >= 14) {
        playerData = Storage.getPlayerData();
        playerData.achievementList.push('ACH016');
        Storage.savePlayerData(playerData);
        addScore(30);
        Storage.saveScoreRecord({
            type: 'achievement',
            name: '打卡达人',
            description: '连续14天打卡',
            score: 30
        });
        unlockedAchievements.push('ACH016');
        playerData = Storage.getPlayerData();
    }
    
    // 检查 ACH017: 签到王者 - 连续30天打卡
    if (!playerData.achievementList.includes('ACH017') && playerData.continueDay >= 30) {
        playerData = Storage.getPlayerData();
        playerData.achievementList.push('ACH017');
        Storage.savePlayerData(playerData);
        addScore(50);
        Storage.saveScoreRecord({
            type: 'achievement',
            name: '签到王者',
            description: '连续30天打卡',
            score: 50
        });
        unlockedAchievements.push('ACH017');
        playerData = Storage.getPlayerData();
    }
    
    if (unlockedAchievements.length > 0) {
        return { continueDay: playerData.continueDay, achievementUnlocked: unlockedAchievements };
    }
    
    return { continueDay: playerData.continueDay };
}

/**
 * 更新周常任务
 */
function updateWeeklyTasks(gameType, difficulty) {
    const tasks = Storage.getWeeklyTasks();
    let totalReward = 0;
    
    // 日常刷题 - 通关任意5题
    if (!tasks.dailyQuiz.completed) {
        tasks.dailyQuiz.progress++;
        if (tasks.dailyQuiz.progress >= tasks.dailyQuiz.target) {
            tasks.dailyQuiz.completed = true;
            totalReward += tasks.dailyQuiz.reward;
        }
    }
    
    // 挑战进阶 - 通关3道中等及以上
    if (!tasks.challengeAdvanced.completed && ['MEDIUM', 'HARD'].includes(difficulty)) {
        tasks.challengeAdvanced.progress++;
        if (tasks.challengeAdvanced.progress >= tasks.challengeAdvanced.target) {
            tasks.challengeAdvanced.completed = true;
            totalReward += tasks.challengeAdvanced.reward;
        }
    }
    
    // 硬核挑战 - 通关2道高级/变体
    if (!tasks.hardcoreChallenge.completed) {
        const isHardcore = difficulty === 'HARD' || 
            ['DIAGONAL', 'ODD_EVEN', 'KILLER_4x4', 'KILLER_6x6', 'KILLER_9x9', 
             'IRREGULAR', 'WINDOKU', 'CENTER_DOT', 'STAR', 'BLACK_WHITE_DOT', 
             'SANDWICH', 'SKYSCRAPER'].includes(gameType);
        if (isHardcore) {
            tasks.hardcoreChallenge.progress++;
            if (tasks.hardcoreChallenge.progress >= tasks.hardcoreChallenge.target) {
                tasks.hardcoreChallenge.completed = true;
                totalReward += tasks.hardcoreChallenge.reward;
            }
        }
    }
    
    Storage.saveWeeklyTasks(tasks);
    
    if (totalReward > 0) {
        addScore(totalReward);
    }
    
    return { tasks, reward: totalReward };
}

/**
 * 处理通关奖励
 */
function handleCompletionRewards(gameType, difficulty, completionTime, attemptCount = 1) {
    // 1. 添加基础分数
    const baseScore = getBaseScore(gameType, difficulty);
    const scoreResult = addScore(baseScore);
    
    // 2. 更新连续打卡天数
    const dayResult = updateContinueDay();
    
    // 3. 检查成就
    const achievements = checkAchievements(gameType, difficulty, completionTime);
    
    // 4. 更新周常任务
    const weeklyTaskResult = updateWeeklyTasks(gameType, difficulty);
    
    // 5. 更新每日任务
    const dailyTaskResult = updateDailyTasks(gameType, difficulty, completionTime, attemptCount);
    
    return {
        baseScore,
        scoreResult,
        dayResult,
        achievements,
        weeklyTaskResult,
        dailyTaskResult
    };
}

// ==================== 涂色模式功能 ====================

// 数字到颜色的映射（用于涂色模式）
const numberColors = {
    1: '#4CAF50',   // 绿色
    2: '#2196F3',   // 蓝色
    3: '#FF9800',   // 橙色
    4: '#F44336',   // 红色
    5: '#9C27B0',   // 紫色
    6: '#00BCD4',   // 青色
    7: '#FFEB3B',   // 黄色
    8: '#FFFFFF',   // 白色
    9: '#E91E63',   // 粉红
};

let isColorMode = false;
let hasWon = false; // 是否已经胜利

/**
 * 切换涂色模式
 */
function toggleColorMode() {
    isColorMode = !isColorMode;

    if (isColorMode) {
        renderColorBoard();
        document.getElementById('colorModeBtn').textContent = '🎨 正常模式';
    } else {
        renderBoard();
        document.getElementById('colorModeBtn').textContent = '🎨 涂色模式';
    }
}

/**
 * 一键答题：自动填写所有候选数唯一的格子
 */
function fillUniqueCandidates() {
    const size = currentPuzzle.size || 9;
    let filledCount = 0;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = row * size + col;

            // 跳过固定数字和已有确定值的格子
            if (originalPuzzle[index] !== '0' || typeof currentBoard[index] === 'number') {
                continue;
            }

            // 如果候选数组只有一个元素，填写它
            if (Array.isArray(currentBoard[index]) && currentBoard[index].length === 1) {
                const num = currentBoard[index][0];
                currentBoard[index] = num;
                filledCount++;

                // 删除同行、同列、同宫中的重复候选数字
                const affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
                affectedIndices.forEach(idx => {
                    if (Array.isArray(currentBoard[idx])) {
                        const candidateIdx = currentBoard[idx].indexOf(num);
                        if (candidateIdx >= 0) {
                            currentBoard[idx].splice(candidateIdx, 1);
                        }
                    }
                });
            }
        }
    }

    // 更新显示
    renderBoard();
    updateNumberButtons();
    scheduleSaveProgress();

    // 提示用户填写了多少个格子
    if (filledCount > 0) {
        console.log(`已自动填写 ${filledCount} 个格子！`);
    } else {
        console.log('没有找到候选数唯一的格子！');
    }
}

/**
 * 渲染涂色模式的棋盘
 */
function renderColorBoard() {
    const board = document.getElementById('sudokuBoard');
    if (!board) return;
    board.innerHTML = '';
    const size = currentPuzzle.size || 9;

    // 动态设置网格列数
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    board.className = 'sudoku-board';

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = i * size + j;
            const cell = document.createElement('div');
            cell.className = 'cell';
            board.appendChild(cell);
        }
    }

    // 先获取当前的格子元素
    const cells = board.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = "";
    });

    // 从中心点开始，一圈一圈向外扩散
    const centerRow = Math.floor(size / 2);
    const centerCol = Math.floor(size / 2);
    const maxDist = size - 1;

    let delay = 100;
    for (let dist = 0; dist <= maxDist; dist++) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const rowDist = Math.abs(i - centerRow);
                const colDist = Math.abs(j - centerCol);
                const maxDistCell = Math.max(rowDist, colDist);

                if (maxDistCell === dist) {
                    const index = i * size + j;
                    const value = currentBoard[index];

                    if (typeof value === 'number' && value !== 0) {
                        setTimeout(() => {
                            cells[index].style.backgroundColor = numberColors[value];
                            cells[index].style.transition = 'background-color 0.3s ease-out';
                        }, delay);
                    }
                }
            }
        }
        delay += 100;
    }
}

// ==================== 页面导航函数 ====================

/**
 * 返回首页（跳转到 index.html）
 */
function goHome() {
    stopTimer();

    // 保存当前游戏进度
    if (currentPuzzle) {
        saveGameProgress();
    }
    location.href = "index.html";
}

/**
 * 显示记录页（跳转到 records.html）
 */
function showRecords() {
    location.href = "records.html";
}

/**
 * 开始游戏（跳转到 game.html）
 */
function startGame(gameType, difficultyType) {
    // 放弃之前未完成的游戏
    const record = getLatestInProgressGame();
    if (record) {
        record.isAbandoned = true;
        record.isCompleted = true;
        Storage.saveRecord(record);
    }

    currentGameType = gameType;
    currentDifficulty = difficultyType;
    localStorage.setItem("currentGameType", gameType);
    localStorage.setItem("currentDifficultyType", difficultyType);
    // 清除继续游戏的记录ID
    localStorage.removeItem("continuePuzzleId");
    location.href = "game.html";
}

/**
 * 生成新题目
 * @param {string} gameType 游戏类型
 */
function generateNewPuzzle(gameType, difficultyType = "EASY") {
    // 显示加载提示
    document.getElementById('sudokuBoard').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">正在生成题目...</div>';

    // 使用setTimeout让UI有时间更新
    setTimeout(() => {
        // 根据难度确定棋盘尺寸、空格数量和游戏类型
        let boardSize, emptyCount, gameTypeStr;
        // const emptyCounts = { MINI_4x4: 12, MINI_6x6: 22, EASY: 35, MEDIUM: 45, HARD: 55, DIAGONAL: 40, ODD_EVEN: 40, KILLER_4x4: 16, KILLER_6x6: 36, KILLER_9x9: 81, IRREGULAR: 45, WINDOKU: 45, SANDWICH: 45 };

        if (gameType === 'MINI_4x4') {
            boardSize = 4;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 12;
            gameTypeStr = 'MINI_4x4';
        } else if (gameType === 'MINI_6x6') {
            boardSize = 6;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 12;
            gameTypeStr = 'MINI_6x6';
        } else if (gameType === 'DIAGONAL') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'DIAGONAL';
        } else if (gameType === 'ODD_EVEN') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'ODD_EVEN';
        } else if (gameType === 'IRREGULAR') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'IRREGULAR';
        } else if (gameType === 'WINDOKU') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'WINDOKU';
        } else if (gameType === 'CENTER_DOT') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'CENTER_DOT';
        } else if (gameType === 'STAR') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 40;
            gameTypeStr = 'STAR';
        } else if (gameType === 'BLACK_WHITE_DOT') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'BLACK_WHITE_DOT';
        } else if (gameType === 'SKYSCRAPER') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'SKYSCRAPER';
        } else if (gameType === 'SANDWICH') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 45;
            gameTypeStr = 'SANDWICH';
        } else if (gameType === 'KILLER_4x4') {
            boardSize = 4;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 16;
            gameTypeStr = 'KILLER';
        } else if (gameType === 'KILLER_6x6') {
            boardSize = 6;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 36;
            gameTypeStr = 'KILLER';
        } else if (gameType === 'KILLER_9x9') {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 81;
            gameTypeStr = 'KILLER';
        } else {
            boardSize = 9;
            emptyCount = getEmptyCountByGameType(gameType, difficultyType) || 35;
            gameTypeStr = 'STANDARD';
        }

        // 设置生成器尺寸和游戏类型
        sudokuGenerator.setSize(boardSize);
        sudokuGenerator.setGameTypeStr(gameTypeStr);

        let fullBoard, puzzleBoard, puzzleStr, solutionStr;
        let oddEvenMarks = null;
        let cages = null;
        let skyscraperClues = null;

        if (gameTypeStr === 'KILLER') {
            // 杀手数独：生成完整解和笼子
            fullBoard = sudokuGenerator.generateKillerSolution();
            cages = sudokuGenerator.cages;
            // 如果有预先生成的带提示数谜题（9x9专用），使用它
            if (sudokuGenerator.puzzleBoard) {
                puzzleBoard = sudokuGenerator.puzzleBoard;
            } else {
                // 杀手数独没有初始数字，全部为空
                puzzleBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
            }
        } else if (gameTypeStr === 'ODD_EVEN') {
            // 奇偶数独：先生成数独解，再根据解生成标记
            const oddEvenResult = sudokuGenerator.generateOddEvenPuzzle();
            fullBoard = oddEvenResult.solution;
            oddEvenMarks = oddEvenResult.marks;
            sudokuGenerator.oddEvenMarks = oddEvenMarks;
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
        } else if (gameTypeStr === 'DIAGONAL') {
            // 对角线数独
            fullBoard = sudokuGenerator.generateFullBoard();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
        } else if (gameTypeStr === 'IRREGULAR') {
            // 锯齿数独：使用专用高效算法
            console.log('🔷 开始生成锯齿数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateIrregularSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 锯齿数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'WINDOKU') {
            // 窗口数独：生成满足窗口约束的解
            console.log('🔷 开始生成窗口数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateWindokuSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 窗口数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'CENTER_DOT') {
            // 中心点数独：生成满足中心区域约束的解
            console.log('🔷 开始生成中心点数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateCenterDotSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 中心点数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'STAR') {
            // 星号数独：生成满足星形区域约束的解
            console.log('🔷 开始生成星号数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateStarSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            console.log(`✅ 星号数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'BLACK_WHITE_DOT') {
            // 黑白点数独：生成满足黑白点规则的解
            console.log('🔷 开始生成黑白点数独题目...');
            const startTime = Date.now();
            const result = sudokuGenerator.generateBlackWhiteDotSolution();
            fullBoard = result.board;
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            blackWhiteDotHints = result.dots;
            console.log(`✅ 黑白点数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'SKYSCRAPER') {
            // 摩天楼数独：生成满足摩天楼规则的解
            console.log('🔷 开始生成摩天楼数独题目...');
            const startTime = Date.now();
            const result = sudokuGenerator.generateSkyscraperSolution();
            fullBoard = result.board;
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            skyscraperClues = result.clues;
            console.log(`✅ 摩天楼数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else if (gameTypeStr === 'SANDWICH') {
            // 三明治数独：生成完整解并计算外部提示
            console.log('🔷 开始生成三明治数独题目...');
            const startTime = Date.now();
            fullBoard = sudokuGenerator.generateSandwichSolution();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
            const sandwichClues = sudokuGenerator.sandwichClues;
            console.log(`✅ 三明治数独题目生成完成，耗时: ${Date.now() - startTime}ms`);
        } else {
            // 标准数独
            fullBoard = sudokuGenerator.generateFullBoard();
            puzzleBoard = sudokuGenerator.createPuzzle(fullBoard, emptyCount);
        }

        // 转换为字符串
        puzzleStr = sudokuGenerator.boardToString(puzzleBoard);
        solutionStr = sudokuGenerator.boardToString(fullBoard);

        // 生成题目ID
        const puzzleId = Storage.getNextPuzzleId();

        // 保存当前题目
        currentPuzzle = {
            id: puzzleId,
            puzzle: puzzleStr,
            solution: solutionStr,
            gameType: gameType,
            size: boardSize,
            gameTypeStr: gameTypeStr,
            oddEvenMarks: oddEvenMarks,
            cages: cages,
            irregularBoxes: gameTypeStr === 'IRREGULAR' ? sudokuGenerator.irregularBoxes : null,
            sandwichClues: gameTypeStr === 'SANDWICH' ? sudokuGenerator.sandwichClues : null,
            blackWhiteDotHints: gameTypeStr === 'BLACK_WHITE_DOT' ? blackWhiteDotHints : null,
            skyscraperClues: gameTypeStr === 'SKYSCRAPER' ? skyscraperClues : null
        };

        originalPuzzle = puzzleStr;
        // 初始化棋盘：固定数字保持为数字，空格初始化为空数组[]
        currentBoard = puzzleStr.split('').map(c => c === '0' ? [] : parseInt(c));

        // 更新显示
        document.getElementById('puzzleNumber').textContent = `题目 #${puzzleId}`;

        // 保存原始题目到记录
        saveOriginalPuzzle(puzzleId, puzzleStr, solutionStr);

        // 加载用户记录
        loadUserRecord();

        // 渲染棋盘
        renderBoard();

        // 启动计时器
        startTimer();
    }, 50);
}

/**
 * 获取不同游戏类型的空格数量
 * @param {string} gameType 游戏类型标识
 * @param {string} difficultyType 难度类型标识
 * @returns {number} 空格数量
 */
function getEmptyCountByGameType(gameType, difficultyType = "EASY") {
    const emptyCounts = {
        MINI_4x4: {
            EASY: 8,
            MEDIUM: 12,
            HARD: 14
        },
        MINI_6x6: {
            EASY: 12,
            MEDIUM: 18,
            HARD: 26
        },
        STANDARD: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        SANDWICH: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        DIAGONAL: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        ODD_EVEN: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        KILLER_4x4: {
            EASY: 8,
            MEDIUM: 12,
            HARD: 16
        },
        KILLER_6x6: {
            EASY: 12,
            MEDIUM: 18,
            HARD: 24
        },
        KILLER_9x9: {
            EASY: 32,
            MEDIUM: 44,
            HARD: 56
        },
        IRREGULAR: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        WINDOKU: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        CENTER_DOT: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        STAR: {
            EASY: 32,
            MEDIUM: 40,
            HARD: 56
        },
        BLACK_WHITE_DOT: {
            EASY: 35,
            MEDIUM: 45,
            HARD: 55
        },
        SKYSCRAPER: {
            EASY: 35,
            MEDIUM: 45,
            HARD: 55
        }
    };
    return emptyCounts[gameType][difficultyType] || 10;
}

/**
 * 获取游戏类型中文名称
 * @param {string} gameType 游戏类型标识
 * @returns {string} 中文名称
 */
function getGameTypeName(gameType) {
    const names = {
        MINI_4x4: '迷你4宫格',
        MINI_6x6: '迷你6宫格',
        EASY: '简单9宫格',
        MEDIUM: '中等9宫格',
        HARD: '高级9宫格',
        STANDARD: '标准9宫格',
        SANDWICH: '三明治数独',
        DIAGONAL: '对角线数独',
        ODD_EVEN: '奇偶数独',
        KILLER_4x4: '杀手4宫格',
        KILLER_6x6: '杀手6宫格',
        KILLER_9x9: '杀手9宫格',
        IRREGULAR: '锯齿数独',
        WINDOKU: '窗口数独',
        CENTER_DOT: '中心点数独',
        STAR: '星号数独',
        BLACK_WHITE_DOT: '黑白点数独',
        SKYSCRAPER: '摩天楼数独'
    };
    return names[gameType] || gameType;
}

/**
 * 获取难度类型中文名称
 * @param {string} difficultyType 难度类型标识
 * @returns {string} 中文名称
 */
function getDifficultyTypeName(difficultyType) {
    const names = {
        EASY: '简单',
        MEDIUM: '中等',
        HARD: '高级'
    };
    return names[difficultyType] || "未知";
}

/**
 * 加载用户记录
 */
function loadUserRecord() {
    const record = Storage.getRecord(currentPuzzle.id);
    if (record) {
        attemptCount = record.attemptCount || 0;
        bestTime = record.bestTime;
        document.getElementById('attemptInfo').textContent = attemptCount > 0 ? `已重置 ${attemptCount} 次` : '未重置';
        if (bestTime) {
            document.getElementById('bestTimeInfo').style.display = 'block';
            document.getElementById('bestTime').textContent = formatTime(bestTime);
        } else {
            document.getElementById('bestTimeInfo').style.display = 'none';
        }
    } else {
        attemptCount = 0;
        bestTime = null;
        document.getElementById('attemptInfo').textContent = '未重置';
        document.getElementById('bestTimeInfo').style.display = 'none';
    }

    // 保存尝试记录
    saveAttemptRecord();
}

/**
 * 保存尝试记录
 */
function saveAttemptRecord() {
    const record = Storage.getRecord(currentPuzzle.id) || {
        puzzleId: currentPuzzle.id,
        gameType: currentGameType,
        difficultyType: currentDifficulty,
        startTime: Date.now(),
        attemptCount: 0,
        isCompleted: false,
        bestTime: null,
        currentBoard: '',
        elapsedTime: 0
    };
    record.attemptCount = attemptCount; // 使用当前的重置次数
    Storage.saveRecord(record);
}

/**
 * 保存当前游戏进度
 */
function saveGameProgress() {
    if (!currentPuzzle) return;

    const record = Storage.getRecord(currentPuzzle.id);
    if (record) {
        // 将棋盘状态转换为JSON字符串保存（支持数组类型的候选数字）
        record.currentBoard = JSON.stringify(currentBoard);
        record.elapsedTime = seconds;
        Storage.saveRecord(record);
    }
}

/**
 * 保存原始题目信息
 */
function saveOriginalPuzzle(puzzleId, puzzleStr, solutionStr) {
    let record = Storage.getRecord(puzzleId);
    if (!record) {
        record = {
            puzzleId: puzzleId,
            originalPuzzle: puzzleStr,
            solution: solutionStr,
            gameType: currentGameType,
            difficultyType: currentDifficulty,
            startTime: Date.now(),
            attemptCount: 0,
            isCompleted: false,
            bestTime: null,
            currentBoard: puzzleStr,
            elapsedTime: 0,
            gameTypeStr: currentPuzzle.gameTypeStr || 'STANDARD',
            oddEvenMarks: currentPuzzle.oddEvenMarks || null,
            cages: currentPuzzle.cages || null,
            irregularBoxes: currentPuzzle.irregularBoxes || null,
            sandwichClues: currentPuzzle.sandwichClues || null,
            blackWhiteDotHints: currentPuzzle.blackWhiteDotHints || null,
            skyscraperClues: currentPuzzle.skyscraperClues || null
        };
    } else {
        record.originalPuzzle = puzzleStr;
        record.solution = solutionStr;
        record.irregularBoxes = currentPuzzle.irregularBoxes || null;
        record.sandwichClues = currentPuzzle.sandwichClues || null;
        record.blackWhiteDotHints = currentPuzzle.blackWhiteDotHints || null;
        record.skyscraperClues = currentPuzzle.skyscraperClues || null;
    }
    Storage.saveRecord(record);
    // 保存当前游戏ID，用于继续游戏
    localStorage.setItem("continuePuzzleId", puzzleId);
}

/**
 * 渲染数独棋盘
 */
function renderBoard() {
    const boardContainer = document.getElementById('sudokuBoard');
    boardContainer.innerHTML = '';
    cellsCache = [];

    // 获取当前棋盘尺寸和游戏类型
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const oddEvenMarks = currentPuzzle.oddEvenMarks;
    const cages = currentPuzzle.cages;
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const sandwichClues = currentPuzzle.sandwichClues;

    // 摩天楼数独需要特殊布局（四个方向外部提示）
    const skyscraperClues = currentPuzzle.skyscraperClues;
    if (gameTypeStr === 'SKYSCRAPER' && skyscraperClues) {
        renderSkyscraperBoard(boardContainer, size, boxRows, boxCols, skyscraperClues);
        return;
    }

    // 三明治数独需要特殊布局（外部提示）
    if (gameTypeStr === 'SANDWICH' && sandwichClues) {
        renderSandwichBoard(boardContainer, size, boxRows, boxCols, sandwichClues);
        return;
    }

    const board = boardContainer;

    // 动态设置网格列数
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    // 根据游戏类型添加样式类
    board.className = `sudoku-board game-type-${gameTypeStr.toLowerCase()}`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);

            // 根据尺寸添加不同的类名用于样式调整
            if (size === 4) {
                cell.classList.add('size-4x4');
            } else if (size === 6) {
                cell.classList.add('size-6x6');
            }

            // 宫格边框
            if (i % boxRows === 0 && i !== 0) cell.classList.add('border-top');
            if (j % boxCols === 0 && j !== 0) cell.classList.add('border-left');

            // 对角线数独：标记对角线上的格子
            if (gameTypeStr === 'DIAGONAL') {
                if (i === j || i + j === size - 1) {
                    cell.classList.add('diagonal-cell');
                }
            }

            // 奇偶数独：根据奇偶性标记格子
            if (gameTypeStr === 'ODD_EVEN' && oddEvenMarks) {
                if (oddEvenMarks[i][j]) {
                    cell.classList.add('odd-cell');
                } else {
                    cell.classList.add('even-cell');
                }
            }

            // 锯齿数独：标记不规则宫格颜色和边框
            if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
                for (let boxIndex = 0; boxIndex < irregularBoxes.length; boxIndex++) {
                    const box = irregularBoxes[boxIndex];
                    if (box.some(cellInfo => cellInfo[0] === i && cellInfo[1] === j)) {
                        // 添加宫格颜色类
                        cell.classList.add(`irregular-box-${boxIndex}`);
                        // 标记宫格边框
                        const isTopEdge = !box.some(c => c[0] === i - 1 && c[1] === j);
                        const isBottomEdge = !box.some(c => c[0] === i + 1 && c[1] === j);
                        const isLeftEdge = !box.some(c => c[1] === j - 1 && c[0] === i);
                        const isRightEdge = !box.some(c => c[1] === j + 1 && c[0] === i);

                        if (isTopEdge) cell.classList.add('irregular-border-top');
                        if (isBottomEdge) cell.classList.add('irregular-border-bottom');
                        if (isLeftEdge) cell.classList.add('irregular-border-left');
                        if (isRightEdge) cell.classList.add('irregular-border-right');
                        break;
                    }
                }
            }

            // 窗口数独：标记四个额外的3x3窗口区域
            if (gameTypeStr === 'WINDOKU') {
                // 定义四个窗口区域（位于棋盘中心，形成十字交叉）
                const windokuRegions = [
                    { startRow: 1, endRow: 3, startCol: 1, endCol: 3 },   // 左上窗口
                    { startRow: 1, endRow: 3, startCol: 5, endCol: 7 },   // 右上窗口
                    { startRow: 5, endRow: 7, startCol: 1, endCol: 3 },   // 左下窗口
                    { startRow: 5, endRow: 7, startCol: 5, endCol: 7 }    // 右下窗口
                ];
                for (const region of windokuRegions) {
                    if (i >= region.startRow && i <= region.endRow &&
                        j >= region.startCol && j <= region.endCol) {
                        cell.classList.add('windoku-cell');
                        break;
                    }
                }
            }

            // 中心点数独：标记九个3x3宫格的中心单元格
            if (gameTypeStr === 'CENTER_DOT') {
                // 每个3x3宫格的中心位置：(1,1), (1,4), (1,7), (4,1), (4,4), (4,7), (7,1), (7,4), (7,7)
                if (i % 3 === 1 && j % 3 === 1) {
                    cell.classList.add('center-cell');
                }
            }

            // 星号数独：标记星形图案单元格
            if (gameTypeStr === 'STAR') {
                const starCells = [
                    [1, 4], [2, 2], [2, 6], [4, 1], [4, 4], [4, 7], [6, 2], [6, 6], [7, 4]
                ];
                if (starCells.some(([sr, sc]) => sr === i && sc === j)) {
                    cell.classList.add('star-cell');
                }
            }

            // 杀手数独：标记笼子信息和边框
            if (gameTypeStr === 'KILLER' && cages) {
                for (let cageIndex = 0; cageIndex < cages.length; cageIndex++) {
                    const cage = cages[cageIndex];
                    if (cage.cells.some(cellInfo => cellInfo.row === i && cellInfo.col === j)) {
                        cell.dataset.cageSum = cage.sum;
                        // 添加笼子颜色类（循环使用12种颜色）
                        const colorIndex = cageIndex % 12;
                        cell.classList.add(`cage-color-${colorIndex}`);
                        // 标记笼子边框
                        const cageCells = cage.cells;
                        const isTopEdge = !cageCells.some(c => c.row === i - 1 && c.col === j);
                        const isBottomEdge = !cageCells.some(c => c.row === i + 1 && c.col === j);
                        const isLeftEdge = !cageCells.some(c => c.col === j - 1 && c.row === i);
                        const isRightEdge = !cageCells.some(c => c.col === j + 1 && c.row === i);

                        if (isTopEdge) cell.classList.add('cage-border-top');
                        if (isBottomEdge) cell.classList.add('cage-border-bottom');
                        if (isLeftEdge) cell.classList.add('cage-border-left');
                        if (isRightEdge) cell.classList.add('cage-border-right');
                        break;
                    }
                }
            }

            const index = i * size + j;
            const value = currentBoard[index];
            const isFixed = originalPuzzle[index] !== '0';

            // 存储单元格信息用于快速访问
            cell.dataset.index = index;
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 杀手数独：创建笼子和元素
            let cageSumEl = null;
            if (gameTypeStr === 'KILLER' && cages && cages.length > 0) {
                const cage = cages.find(c => c.cells.some(cellInfo => cellInfo.row === i && cellInfo.col === j));
                if (cage) {
                    const isFirstCell = cage.cells[0].row === i && cage.cells[0].col === j;
                    if (isFirstCell) {
                        cageSumEl = document.createElement('div');
                        cageSumEl.className = 'cage-sum';
                        cageSumEl.textContent = cage.sum;
                    }
                }
            }

            // 判断是确定值还是候选值
            if (typeof value === 'number' && value !== 0) {
                // 确定值
                const valueEl = document.createElement('span');
                valueEl.textContent = getIcon(value);
                valueEl.style.position = 'absolute';
                valueEl.style.top = '50%';
                valueEl.style.left = '50%';
                valueEl.style.transform = 'translate(-50%, -50%)';
                valueEl.style.zIndex = '5';
                cell.appendChild(valueEl);
                if (isFixed) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            } else if (Array.isArray(value) && value.length > 0) {
                // 候选值
                const candidatesEl = createCandidatesElement(value, i, j);
                cell.appendChild(candidatesEl);
            }

            // 最后添加笼子和（确保在最上层）
            if (cageSumEl) {
                cell.appendChild(cageSumEl);
            }

            if (!hasWon) {
                cell.addEventListener('click', () => selectCell(i, j, cell));
            }
            board.appendChild(cell);
            cellsCache.push(cell);
        }
    }

    // 生成数字键盘
    generateNumberKeypad();

    // 更新数字按钮状态
    updateNumberButtons();

    // 渲染黑白点数独的点标记
    renderBlackWhiteDots(board);
}

/**
 * 渲染黑白点数独的点标记
 */
function renderBlackWhiteDots(board) {
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    if (gameTypeStr !== 'BLACK_WHITE_DOT') return;

    const dots = currentPuzzle.blackWhiteDotHints;
    if (!dots || dots.length === 0) return;

    // 使用requestAnimationFrame确保DOM已完全渲染
    requestAnimationFrame(() => {
        // 获取第一个单元格的实际尺寸作为参考
        const firstCell = board.querySelector('.cell');
        if (!firstCell) return;

        const cellRect = firstCell.getBoundingClientRect();
        const cellSize = cellRect.width;

        // 获取目标单元格来精确计算位置
        dots.forEach(dot => {
            const dotEl = document.createElement('div');
            dotEl.className = `dot-marker ${dot.type}`;

            let targetCell;
            let left, top;

            if (dot.direction === 'right') {
                // 右边相邻，点在两个格子之间，获取右边单元格
                targetCell = board.querySelector(`[data-row="${dot.row}"][data-col="${dot.col + 1}"]`);
                if (targetCell) {
                    const targetRect = targetCell.getBoundingClientRect();
                    const currentCell = board.querySelector(`[data-row="${dot.row}"][data-col="${dot.col}"]`);
                    if (currentCell) {
                        const currentRect = currentCell.getBoundingClientRect();
                        left = currentRect.right + (targetRect.left - currentRect.right) / 2;
                        top = currentRect.top + currentRect.height / 2;
                    }
                }
            } else {
                // 下边相邻，点在两个格子之间，获取下边单元格
                targetCell = board.querySelector(`[data-row="${dot.row + 1}"][data-col="${dot.col}"]`);
                if (targetCell) {
                    const targetRect = targetCell.getBoundingClientRect();
                    const currentCell = board.querySelector(`[data-row="${dot.row}"][data-col="${dot.col}"]`);
                    if (currentCell) {
                        const currentRect = currentCell.getBoundingClientRect();
                        left = currentRect.left + currentRect.width / 2;
                        top = currentRect.bottom + (targetRect.top - currentRect.bottom) / 2;
                    }
                }
            }

            // 如果无法获取单元格，使用备用计算方法
            if (isNaN(left) || isNaN(top)) {
                left = (dot.direction === 'right' ? (dot.col + 1) : (dot.col + 0.5)) * cellSize + 0.5;
                top = (dot.direction === 'right' ? (dot.row + 0.5) : (dot.row + 1)) * cellSize + 0.5;
            }

            // 转换为相对于board的位置
            const boardRect = board.getBoundingClientRect();
            dotEl.style.left = `${left - boardRect.left}px`;
            dotEl.style.top = `${top - boardRect.top}px`;
            board.appendChild(dotEl);
        });
    });
}

/**
 * 渲染摩天楼数独棋盘（带四个方向外部提示）
 * @param {HTMLElement} container - 容器元素
 * @param {number} size - 棋盘尺寸
 * @param {number} boxRows - 宫格行数
 * @param {number} boxCols - 宫格列数
 * @param {object} skyscraperClues - 摩天楼提示 {top, bottom, left, right}
 */
function renderSkyscraperBoard(container, size, boxRows, boxCols, skyscraperClues) {
    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'skyscraper-layout';

    // 创建顶部提示行（11个元素，首尾为空）
    const topClues = document.createElement('div');
    topClues.className = 'skyscraper-clues-top';
    for (let col = 0; col < skyscraperClues.top.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.top[col] || '';
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建中间行（左侧提示 + 棋盘 + 右侧提示）
    const middleRow = document.createElement('div');
    middleRow.className = 'skyscraper-middle-row';

    // 创建左侧提示列（11个元素，首尾为空）
    const leftClues = document.createElement('div');
    leftClues.className = 'skyscraper-clues-left';
    for (let row = 0; row < skyscraperClues.left.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.left[row] || '';
        leftClues.appendChild(clue);
    }
    middleRow.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-skyscraper';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);

            // 根据尺寸添加不同的类名用于样式调整
            if (size === 4) {
                cell.classList.add('size-4x4');
            } else if (size === 6) {
                cell.classList.add('size-6x6');
            }

            // 宫格边框
            if (i % boxRows === 0 && i !== 0) cell.classList.add('border-top');
            if (j % boxCols === 0 && j !== 0) cell.classList.add('border-left');

            const index = i * size + j;
            const value = currentBoard[index];
            const isFixed = originalPuzzle[index] !== '0';

            // 存储单元格信息用于快速访问
            cell.dataset.index = index;
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 判断是确定值还是候选值
            if (typeof value === 'number' && value !== 0) {
                // 确定值
                const valueEl = document.createElement('span');
                valueEl.textContent = getIcon(value);
                valueEl.style.position = 'absolute';
                valueEl.style.top = '50%';
                valueEl.style.left = '50%';
                valueEl.style.transform = 'translate(-50%, -50%)';
                valueEl.style.zIndex = '5';
                cell.appendChild(valueEl);
                if (isFixed) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            } else if (Array.isArray(value) && value.length > 0) {
                // 候选值
                const candidatesEl = createCandidatesElement(value, i, j);
                cell.appendChild(candidatesEl);
            }

            if (!hasWon) {
                cell.addEventListener('click', () => selectCell(i, j, cell));
            }
            board.appendChild(cell);
            cellsCache.push(cell);
        }
    }
    middleRow.appendChild(board);

    // 创建右侧提示列（11个元素，首尾为空）
    const rightClues = document.createElement('div');
    rightClues.className = 'skyscraper-clues-right';
    for (let row = 0; row < skyscraperClues.right.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.right[row] || '';
        rightClues.appendChild(clue);
    }
    middleRow.appendChild(rightClues);

    layout.appendChild(middleRow);

    // 创建底部提示行（11个元素，首尾为空）
    const bottomClues = document.createElement('div');
    bottomClues.className = 'skyscraper-clues-bottom';
    for (let col = 0; col < skyscraperClues.bottom.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.bottom[col] || '';
        bottomClues.appendChild(clue);
    }
    layout.appendChild(bottomClues);

    container.appendChild(layout);

    // 生成数字键盘
    generateNumberKeypad();

    // 更新数字按钮状态
    updateNumberButtons();
}

/**
 * 渲染三明治数独棋盘（带外部提示）
 * @param {HTMLElement} container - 容器元素
 * @param {number} size - 棋盘尺寸
 * @param {number} boxRows - 宫格行数
 * @param {number} boxCols - 宫格列数
 * @param {object} sandwichClues - 三明治提示
 */
function renderSandwichBoard(container, size, boxRows, boxCols, sandwichClues) {
    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'sandwich-layout';

    // 创建左上角空白占位
    const topLeftEmpty = document.createElement('div');
    topLeftEmpty.className = 'sandwich-top-left-empty';
    layout.appendChild(topLeftEmpty);

    // 创建顶部提示行
    const topClues = document.createElement('div');
    topClues.className = 'sandwich-clues-top';
    // 顶部提示（列提示）- 确保只渲染与棋盘列数相同数量的提示
    for (let col = 0; col < size; col++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.left[col] || 0;
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建左侧提示列
    const leftClues = document.createElement('div');
    leftClues.className = 'sandwich-clues-left';
    // 左侧提示（行提示）- 确保只渲染与棋盘行数相同数量的提示
    for (let row = 0; row < size; row++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.top[row] || 0;
        leftClues.appendChild(clue);
    }
    layout.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-sandwich';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);

            // 根据尺寸添加不同的类名用于样式调整
            if (size === 4) {
                cell.classList.add('size-4x4');
            } else if (size === 6) {
                cell.classList.add('size-6x6');
            }

            // 宫格边框
            if (i % boxRows === 0 && i !== 0) cell.classList.add('border-top');
            if (j % boxCols === 0 && j !== 0) cell.classList.add('border-left');

            const index = i * size + j;
            const value = currentBoard[index];
            const isFixed = originalPuzzle[index] !== '0';

            // 存储单元格信息用于快速访问
            cell.dataset.index = index;
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 判断是确定值还是候选值
            if (typeof value === 'number' && value !== 0) {
                // 确定值
                const valueEl = document.createElement('span');
                valueEl.textContent = getIcon(value);
                valueEl.style.position = 'absolute';
                valueEl.style.top = '50%';
                valueEl.style.left = '50%';
                valueEl.style.transform = 'translate(-50%, -50%)';
                valueEl.style.zIndex = '5';
                cell.appendChild(valueEl);
                if (isFixed) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            } else if (Array.isArray(value) && value.length > 0) {
                // 候选值
                const candidatesEl = createCandidatesElement(value, i, j);
                cell.appendChild(candidatesEl);
            }

            if (!hasWon) {
                cell.addEventListener('click', () => selectCell(i, j, cell));
            }
            board.appendChild(cell);
            cellsCache.push(cell);
        }
    }
    // 将棋盘添加到布局容器
    layout.appendChild(board);

    container.appendChild(layout);

    // 生成数字键盘
    generateNumberKeypad();

    // 更新数字按钮状态
    updateNumberButtons();
}

/**
    * 检查数字在同行/列/宫中是否唯一出现（仅在候选数字中）
    * 只要在四种情况中的任一种情况下唯一，就返回 true
    * @param {number} row - 行号
    * @param {number} col - 列号
    * @param {number} num - 数字
    * @returns {boolean} - 是否在任一种情况下唯一
    */
function isCandidateUnique(row, col, num) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const index = row * size + col;

    // 首先检查：如果同行、同列或同宫已经有确定值num，
    // 那么当前格子的候选数num实际上是无效的，不应该高亮
    // 条件0：检查同行是否已有确定值num
    for (let c = 0; c < size; c++) {
        const idx = row * size + c;
        if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
            return false;
        }
    }

    // 检查同列是否已有确定值num
    for (let r = 0; r < size; r++) {
        const idx = r * size + col;
        if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
            return false;
        }
    }

    // 检查同宫是否已有确定值num
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const idx = r * size + c;
                    if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
                        return false;
                    }
                }
                break;
            }
        }
    } else {
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                const idx = r * size + c;
                if (typeof currentBoard[idx] === 'number' && currentBoard[idx] === num) {
                    return false;
                }
            }
        }
    }

    // 条件0.5：如果当前格子的候选数只有一个，那么这个候选数应该高亮
    // 这是"唯一候选"策略，与下面的"唯一位置"策略是两种不同的高亮逻辑
    const currentCellValue = currentBoard[index];
    if (Array.isArray(currentCellValue) && currentCellValue.length === 1 && currentCellValue[0] === num) {
        return true;
    }

    // 条件1：检查同行是否唯一（该数字在该行只有这一个可填位置）
    let rowUnique = true;
    for (let c = 0; c < size; c++) {
        const idx = row * size + c;
        if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
            rowUnique = false;
            break;
        }
    }

    // 条件2：检查同列是否唯一（该数字在该列只有这一个可填位置）
    let colUnique = true;
    for (let r = 0; r < size; r++) {
        const idx = r * size + col;
        if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
            colUnique = false;
            break;
        }
    }

    // 条件3：检查同宫是否唯一（该数字在该宫只有这一个可填位置）
    let boxUnique = true;
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        // 锯齿数独：检查不规则宫格
        for (const box of irregularBoxes) {
            if (box.some(cell => cell[0] === row && cell[1] === col)) {
                for (const cell of box) {
                    const [r, c] = cell;
                    const idx = r * size + c;
                    if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
                        boxUnique = false;
                        break;
                    }
                }
                break;
            }
        }
    } else {
        // 标准数独：检查规则宫格
        const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
        const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
        const boxRowStart = Math.floor(row / boxRows) * boxRows;
        const boxColStart = Math.floor(col / boxCols) * boxCols;
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
            for (let c = boxColStart; c < boxColStart + boxCols; c++) {
                const idx = r * size + c;
                if (idx !== index && Array.isArray(currentBoard[idx]) && currentBoard[idx].includes(num)) {
                    boxUnique = false;
                    break;
                }
            }
            if (!boxUnique) break;
        }
    }

    // 只有在任一种情况下唯一，才返回 true
    return rowUnique || colUnique || boxUnique;
}

/**
    * 创建候选数字元素（优化：缓存常用元素）
    * @param {number[]} values - 候选数字数组
    * @param {number} row - 行号（用于判断唯一性）
    * @param {number} col - 列号（用于判断唯一性）
    */
function createCandidatesElement(values, row, col) {
    const candidatesEl = document.createElement('div');
    candidatesEl.className = 'cell-candidates';
    const size = currentPuzzle.size || 9;

    // 根据尺寸添加不同的类名用于样式调整
    if (size === 4) {
        candidatesEl.classList.add('size-4x4');
    } else if (size === 6) {
        candidatesEl.classList.add('size-6x6');
    }

    const maxNum = size;
    for (let n = 1; n <= maxNum; n++) {
        const candidateEl = document.createElement('span');
        if (values.includes(n)) {
            // 只有当数字在同行/列/宫中唯一时才显示彩色背景
            if (isCandidateUnique(row, col, n)) {
                candidateEl.className = `candidate-num c${n}`;
            } else {
                candidateEl.className = 'candidate-num candidate-normal';
            }
            candidateEl.textContent = n;
        } else {
            candidateEl.className = 'candidate-num';
            candidateEl.textContent = '';
        }
        candidatesEl.appendChild(candidateEl);
    }
    return candidatesEl;
}

/**
    * 更新单个单元格显示（优化：局部更新）
    * @param {number} index - 单元格索引
    */
function updateCellDisplay(index) {
    if (!cellsCache || !cellsCache[index]) return;

    const cell = cellsCache[index];
    const value = currentBoard[index];
    const isFixed = originalPuzzle[index] !== '0';
    const size = currentPuzzle.size || 9;
    const row = Math.floor(index / size);
    const col = index % size;

    // 保存笼子和元素（如果存在）
    const cageSumEl = cell.querySelector('.cage-sum');

    // 清除之前的内容
    cell.innerHTML = '';
    cell.classList.remove('fixed', 'user-input', 'conflict');

    if (typeof value === 'number') {
        const valueEl = document.createElement('span');
        valueEl.textContent = getIcon(value);
        valueEl.style.position = 'absolute';
        valueEl.style.top = '50%';
        valueEl.style.left = '50%';
        valueEl.style.transform = 'translate(-50%, -50%)';
        valueEl.style.zIndex = '5';
        cell.appendChild(valueEl);
        if (isFixed) {
            cell.classList.add('fixed');
        } else {
            cell.classList.add('user-input');
        }
    } else if (Array.isArray(value) && value.length > 0) {
        cell.appendChild(createCandidatesElement(value, row, col));
    }

    // 最后重新添加笼子和元素（确保在最上层）
    if (cageSumEl) {
        cell.appendChild(cageSumEl);
    }
}

/**
    * 初始化单元格缓存
    */
function initCellsCache() {
    if (!cellsCache || cellsCache.length === 0) {
        cellsCache = Array.from(document.querySelectorAll('.cell'));
    }
    return cellsCache;
}

/**
    * 选中单元格（优化版：减少重复操作）
    */
function selectCell(row, col, cell) {
    const size = currentPuzzle.size || 9;
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const index = row * size + col;
    const clickedValue = currentBoard[index];
    const cells = initCellsCache();

    // 获取当前单元格所属的不规则宫格（如果是锯齿数独）
    let currentBoxCells = null;
    if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
        for (const box of irregularBoxes) {
            if (box.some(cellInfo => cellInfo[0] === row && cellInfo[1] === col)) {
                currentBoxCells = box;
                break;
            }
        }
    }

    // 清除之前选中单元格的样式
    if (selectedCell && cells[selectedCell.index]) {
        cells[selectedCell.index].classList.remove('selected');
    }

    // 清除所有高亮样式（每次选中新格子都重新计算）
    cells.forEach(c => {
        c.classList.remove('highlighted-row', 'highlighted-col', 'highlighted-box', 'highlighted-num');
    });

    // 应用行、列、宫高亮（无论是否有确定值）
    cells.forEach((c, idx) => {
        const cellRow = Math.floor(idx / size);
        const cellCol = idx % size;

        if (cellRow === row) c.classList.add('highlighted-row');
        if (cellCol === col) c.classList.add('highlighted-col');

        // 宫格高亮（支持标准和锯齿数独）
        if (gameTypeStr === 'IRREGULAR' && currentBoxCells) {
            // 锯齿数独：检查是否在同一不规则宫格
            if (currentBoxCells.some(cellInfo => cellInfo[0] === cellRow && cellInfo[1] === cellCol)) {
                c.classList.add('highlighted-box');
            }
        } else {
            // 标准数独：检查规则宫格
            const boxRowStart = Math.floor(row / boxRows) * boxRows;
            const boxColStart = Math.floor(col / boxCols) * boxCols;
            if (cellRow >= boxRowStart && cellRow < boxRowStart + boxRows &&
                cellCol >= boxColStart && cellCol < boxColStart + boxCols) {
                c.classList.add('highlighted-box');
            }
        }
    });

    // 如果点击的是确定值，高亮相同数字
    if (clickedValue !== 0 && typeof clickedValue === 'number') {
        cells.forEach((c, idx) => {
            if (currentBoard[idx] === clickedValue) {
                c.classList.add('highlighted-num');
            }
        });
    }

    cell.classList.add('selected');
    selectedCell = { row, col, index };

    if (selectedNumber !== null) {
        placeNumber(selectedNumber);
    }
}

/**
    * 统计数字在棋盘上作为确定值出现的次数
    * @param {number} num - 要统计的数字（1-9）
    * @returns {number} - 出现次数
    */
function countNumberOccurrences(num) {
    return currentBoard.filter(cell => typeof cell === 'number' && cell === num).length;
}

/**
    * 动态生成数字键盘
    */
function generateNumberKeypad() {
    const keypad = document.getElementById('numberKeyPad');
    keypad.innerHTML = '';

    const size = currentPuzzle.size || 9;

    // 根据尺寸决定列数
    const cols = size <= 4 ? 4 : 5;
    keypad.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // 生成数字按钮
    for (let num = 1; num <= size; num++) {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.onclick = () => selectNumber(num);
        btn.innerHTML = `<span class="num-icon">${getIcon(num)}</span><span class="num-remaining">${size}</span>`;
        keypad.appendChild(btn);
    }

    // 添加清除按钮
    const clearBtn = document.createElement('button');
    clearBtn.className = 'num-btn num-btn-clear';
    clearBtn.onclick = () => selectNumber(0);
    clearBtn.textContent = '✕';
    keypad.appendChild(clearBtn);
}

/**
    * 更新数字按钮的显示状态
    */
function updateNumberButtons() {
    const size = currentPuzzle.size || 9;

    // 第一步：收集所有数字的剩余数量
    const remainings = [];
    for (let num = 1; num <= size; num++) {
        const count = countNumberOccurrences(num);
        const remaining = size - count;
        remainings.push({ num, remaining });
    }

    // 找出最小剩余数量（排除已用完的数字）
    const availableRemainings = remainings.filter(r => r.remaining > 0);
    const minRemaining = availableRemainings.length > 0
        ? Math.min(...availableRemainings.map(r => r.remaining))
        : null;

    // 获取所有数字按钮（排除清除按钮）
    const numBtns = Array.from(document.querySelectorAll('.num-btn')).filter(btn => !btn.classList.contains('num-btn-clear'));

    // 第二步：更新每个按钮的状态
    for (let num = 1; num <= size; num++) {
        const count = countNumberOccurrences(num);
        const remaining = size - count;
        const btn = numBtns[num - 1];
        if (!btn) continue;

        const remainingEl = btn.querySelector('.num-remaining');
        const iconEl = btn.querySelector('.num-icon');

        // 更新图标显示
        if (iconEl) {
            iconEl.textContent = getIcon(num);
        }

        if (remainingEl) {
            remainingEl.textContent = remaining.toString();
        }

        if (remaining === 0) {
            btn.classList.add('disabled');
            btn.classList.remove('min-remaining');
        } else {
            btn.classList.remove('disabled');
            // 如果是剩余数量最少的，添加高亮样式
            if (remaining === minRemaining) {
                btn.classList.add('min-remaining');
            } else {
                btn.classList.remove('min-remaining');
            }
        }
    }

    // 如果所有数字都已用完，自动触发检查答案（但胜利后不再自动检查）
    if (!hasWon && availableRemainings.length === 0) {
        checkSolution();
    }
}

/**
    * 选择数字
    */
function selectNumber(num) {
    // 清除所有按钮的激活状态
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));

    // 如果点击的是清除按钮（0）
    if (num === 0) {
        if (selectedCell !== null) {
            placeNumber(0);
        }
        selectedNumber = null;
        return;
    }

    // 草稿模式下不需要检查剩余数量
    if (inputMode === 'exact') {
        // 检查该数字是否还有剩余
        const count = countNumberOccurrences(num);
        const remaining = 9 - count;

        // 如果剩余数量为0，不允许选择
        if (remaining === 0) {
            return;
        }
    }

    // 如果当前选中的数字和点击的相同，取消选择
    if (selectedNumber !== null && selectedNumber === num) {
        selectedNumber = null;
        return;
    }

    selectedNumber = num;
    document.querySelectorAll('.num-btn')[num - 1].classList.add('active');

    if (selectedCell !== null) {
        placeNumber(num);
    }
}

/**
    * 放置数字（优化版：局部更新）
    */
function placeNumber(num) {
    if (!selectedCell) return;

    const index = selectedCell.index;
    const row = selectedCell.row;
    const col = selectedCell.col;

    // 检查是否为固定数字
    if (originalPuzzle[index] !== '0') return;

    // 需要更新的单元格索引集合
    const updatedIndices = new Set([index]);

    // 根据输入模式执行不同操作
    if (inputMode === 'exact') {
        // 确定模式：设置确定值
        if (num === 0) {
            // 清除
            currentBoard[index] = [];

            // 清除后，同行、同列、同宫的候选数高亮状态可能改变
            const affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
            affectedIndices.forEach(idx => {
                if (Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 0) {
                    updatedIndices.add(idx);
                }
            });
        } else {
            // 设置确定值
            currentBoard[index] = num;

            // 删除同行、同列、同宫中的重复候选数字
            const affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
            affectedIndices.forEach(idx => {
                if (Array.isArray(currentBoard[idx])) {
                    const candidateIdx = currentBoard[idx].indexOf(num);
                    if (candidateIdx >= 0) {
                        currentBoard[idx].splice(candidateIdx, 1);
                    }
                    // 无论是否移除了候选数，都需要更新显示
                    // 因为其他候选数可能因为这次移除而变得唯一
                    updatedIndices.add(idx);
                }
            });
        }
    } else {
        // 草稿模式：添加或移除候选数字
        if (num === 0) {
            // 清除所有候选
            currentBoard[index] = [];
        } else {
            if (typeof currentBoard[index] === 'number') {
                // 如果当前是确定值，转换为候选数组
                currentBoard[index] = [num];
            } else if (Array.isArray(currentBoard[index])) {
                const candidateIdx = currentBoard[index].indexOf(num);
                if (candidateIdx >= 0) {
                    // 移除已存在的候选
                    currentBoard[index].splice(candidateIdx, 1);
                } else {
                    // 添加新候选并排序
                    currentBoard[index].push(num);
                    currentBoard[index].sort((a, b) => a - b);
                }
            }
        }

        // 草稿模式下，候选数字变化会影响同行、列、宫的唯一效果
        // 需要更新这些位置的显示
        const affectedIndices = [...getRows(row, col), ...getCols(row, col), ...getBoxes(row, col)];
        affectedIndices.forEach(idx => {
            if (Array.isArray(currentBoard[idx]) && currentBoard[idx].length > 0) {
                updatedIndices.add(idx);
            }
        });
    }

    // 优化：只更新受影响的单元格
    updatedIndices.forEach(idx => updateCellDisplay(idx));

    // 如果填入的是确定值，高亮所有相同数字的格子（与选中有数字格子的效果一致）
    if (inputMode === 'exact' && num !== 0) {
        const cells = initCellsCache();
        // 先清除之前的高亮
        cells.forEach(c => c.classList.remove('highlighted-num'));
        // 高亮所有相同数字的格子
        cells.forEach((c, idx) => {
            if (currentBoard[idx] === num) {
                c.classList.add('highlighted-num');
            }
        });
    }

    // 检查冲突（只检查确定值）
    checkConflicts();

    // 保持当前格子的选中状态（添加选中样式）
    const cells = initCellsCache();
    if (cells[index]) {
        cells[index].classList.add('selected');
    }

    // 自动保存进度（使用防抖优化）
    scheduleSaveProgress();

    // 更新数字按钮状态
    updateNumberButtons();

    // 重置选中状态
    selectedNumber = null;

    // 移除所有数字按钮的激活样式
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));
}

// 防抖定时器
let saveProgressTimer = null;

/**
    * 防抖保存进度
    */
function scheduleSaveProgress() {
    if (saveProgressTimer) {
        clearTimeout(saveProgressTimer);
    }
    saveProgressTimer = setTimeout(() => {
        saveGameProgress();
    }, 500); // 500ms 防抖
}

/**
    * 检查冲突（优化版：减少重复检查）
    */
function checkConflicts() {
    const size = currentPuzzle.size || 9;
    const boxRows = size === 4 ? 2 : (size === 6 ? 2 : 3);
    const boxCols = size === 4 ? 2 : (size === 6 ? 3 : 3);
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const irregularBoxes = currentPuzzle.irregularBoxes;
    const cells = initCellsCache();

    // 使用 Set 存储有冲突的索引
    const conflictIndices = new Set();

    // 检查每个确定值单元格（只有确定值才会产生冲突）
    for (let i = 0; i < size * size; i++) {
        const value = currentBoard[i];
        // 只检查确定值（数字类型）
        if (typeof value !== 'number' || value === 0) continue;

        const row = Math.floor(i / size);
        const col = i % size;

        // 检查同行冲突
        for (let j = 0; j < size; j++) {
            const idx = row * size + j;
            if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                conflictIndices.add(i);
                conflictIndices.add(idx);
            }
        }

        // 检查同列冲突
        for (let r = 0; r < size; r++) {
            const idx = r * size + col;
            if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                conflictIndices.add(i);
                conflictIndices.add(idx);
            }
        }

        // 检查宫格冲突（标准或不规则）
        if (gameTypeStr === 'IRREGULAR' && irregularBoxes) {
            // 锯齿数独：检查不规则宫格
            for (const box of irregularBoxes) {
                if (box.some(cell => cell[0] === row && cell[1] === col)) {
                    for (const cell of box) {
                        const [r, c] = cell;
                        const idx = r * size + c;
                        if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                            conflictIndices.add(i);
                            conflictIndices.add(idx);
                        }
                    }
                    break;
                }
            }
        } else {
            // 标准数独：检查规则宫格
            const boxRow = Math.floor(row / boxRows) * boxRows;
            const boxCol = Math.floor(col / boxCols) * boxCols;
            for (let r = boxRow; r < boxRow + boxRows; r++) {
                for (let c = boxCol; c < boxCol + boxCols; c++) {
                    const idx = r * size + c;
                    if (idx !== i && typeof currentBoard[idx] === 'number' && currentBoard[idx] === value) {
                        conflictIndices.add(i);
                        conflictIndices.add(idx);
                    }
                }
            }
        }
    }

    // 批量更新 DOM
    cells.forEach((c, idx) => {
        if (conflictIndices.has(idx)) {
            c.classList.add('conflict');
        } else {
            c.classList.remove('conflict');
        }
    });
}

/**
    * 检查答案
    */
function checkSolution() {
    // 检查是否所有格子都填了确定值
    const hasEmptyOrCandidate = currentBoard.some(cell =>
        Array.isArray(cell) || (typeof cell === 'number' && cell === 0)
    );
    if (hasEmptyOrCandidate) {
        alert('还有空格或候选数字未填写！');
        return;
    }

    // 检查是否有冲突
    const hasConflict = document.querySelector('.cell.conflict');
    if (hasConflict) {
        alert('存在冲突，请检查红色标记的格子！');
        return;
    }

    // 验证答案
    const userSolution = currentBoard.join('');
    if (userSolution === currentPuzzle.solution) {
        // 答案正确
        stopTimer();

        // 保存完成记录
        const record = Storage.getRecord(currentPuzzle.id) || {
            puzzleId: currentPuzzle.id,
            gameType: currentGameType,
            difficultyType: currentDifficulty,
            attemptCount: attemptCount,
            isCompleted: false,
            bestTime: null,
            originalPuzzle: currentPuzzle.originalPuzzle || '',
            solution: currentPuzzle.solution || '',
            cages: currentPuzzle.cages || null,
            irregularBoxes: currentPuzzle.irregularBoxes || null
        };

        const isNewRecord = !record.bestTime || seconds < record.bestTime;
        record.isCompleted = true;
        record.completionTime = seconds;
        if (isNewRecord) {
            record.bestTime = seconds;
        }

        // 先保存游戏记录（确保任务检查时能看到）
        Storage.saveRecord(record);
        
        // 处理通关奖励
        const rewardResult = handleCompletionRewards(currentGameType, currentDifficulty, seconds, attemptCount);
        
        // 保存基础通关分数为积分记录
        Storage.saveScoreRecord({
            type: 'game',
            name: `${getGameTypeName(currentGameType)} - ${getDifficultyTypeName(currentDifficulty)}`,
            description: `通关数独，用时 ${formatTime(seconds)}`,
            score: rewardResult.baseScore
        });
        
        // 保存周常任务奖励为积分记录
        if (rewardResult.weeklyTaskResult.reward > 0) {
            Storage.saveScoreRecord({
                type: 'task',
                name: '周常任务奖励',
                description: '完成周常任务',
                score: rewardResult.weeklyTaskResult.reward
            });
        }
        
        // 保存每日任务奖励为积分记录（已在 updateDailyTasks 中处理）
        
        // 更新记录中的分数信息
        record.earnedScore = rewardResult.baseScore;
        record.totalScore = rewardResult.baseScore;
        Storage.saveRecord(record);
        
        // 显示涂色模式按钮
        document.getElementById('colorModeBtn').style.display = 'inline-block';

        // 标记已胜利
        hasWon = true;

        // 显示胜利弹窗
        document.getElementById('completionTime').textContent = formatTime(seconds);

        if (isNewRecord) {
            document.getElementById('newRecordMsg').style.display = 'block';
        } else {
            document.getElementById('newRecordMsg').style.display = 'none';
        }

        if (record.bestTime) {
            document.getElementById('bestRecordMsg').style.display = 'block';
            document.getElementById('finalBestTime').textContent = formatTime(record.bestTime);
        }
        // 显示胜利弹窗，隐藏数字输入和游戏控制
        document.getElementById('winModal').style.display = 'block';
        document.getElementById('numberKeyPad').style.display = 'none';
        document.getElementById('gameControls').style.display = 'none';
        document.getElementById('modeToggleBtn').style.display = 'none';
    } else {
        alert('答案不正确，请继续尝试！');
    }
}

/**
    * 重置题目
    */
function resetPuzzle() {
    // 重置棋盘：固定数字保持为数字，空格初始化为空数组[]
    currentBoard = originalPuzzle.split('').map(c => c === '0' ? [] : parseInt(c));
    selectedCell = null;
    selectedNumber = null;
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));
    renderBoard();
    seconds = 0;
    updateTimerDisplay();
    
    // 重置题目，尝试次数+1
    attemptCount++;
    document.getElementById('attemptInfo').textContent = `已重置 ${attemptCount} 次`;
}

/**
    * 新题目
    */
function newPuzzle() {
    // 将当前游戏标记为已放弃
    if (currentPuzzle) {
        const record = Storage.getRecord(currentPuzzle.id);
        if (record && !record.isCompleted && !record.isAbandoned) {
            record.isAbandoned = true;
            record.isCompleted = true;
            Storage.saveRecord(record);
        }
    }

    // 生成新题目
    generateNewPuzzle(currentGameType, currentDifficulty);
    selectedNumber = null;
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));

    // 重置游戏控制
    resetGameControls();
}

/**
    * 重置游戏控制
    */
function resetGameControls() {
    // 重置涂色模式
    isColorMode = false;
    document.getElementById('colorModeBtn').textContent = '🎨 涂色模式';
    document.getElementById('colorModeBtn').style.display = 'none';
    // 重置胜利状态
    hasWon = false;
    // 重置数字输入和游戏控制
    document.getElementById('numberKeyPad').style.display = 'grid';
    document.getElementById('gameControls').style.display = 'flex';
    document.getElementById('modeToggleBtn').style.display = 'inline-block';
}

// ==================== 计时器函数 ====================

/**
    * 启动计时器
    * @param {number} startSeconds - 初始时间（秒），默认为0
    */
function startTimer(startSeconds = 0) {
    stopTimer();
    seconds = startSeconds;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

/**
    * 停止计时器
    */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
    * 更新计时器显示
    */
function updateTimerDisplay() {
    document.getElementById('timer').textContent = formatTime(seconds);
}

/**
    * 格式化时间
    */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
    * 格式化日期时间
    */
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

/**
    * 当前查看的题目数据
    */
let currentViewPuzzleData = null;

/**
    * 查看已完成的题目
    */
function viewPuzzle(puzzleId) {
    const record = Storage.getRecord(puzzleId);
    if (!record || !record.originalPuzzle) {
        alert('无法找到题目数据');
        return;
    }

    currentViewPuzzleData = {
        puzzleId: record.puzzleId,
        puzzle: record.originalPuzzle,
        solution: record.solution,
        gameType: record.gameType,
        difficultyType: record.difficultyType,
        irregularBoxes: record.irregularBoxes || null,
        cages: record.cages || null,
        sandwichClues: record.sandwichClues || null,
        blackWhiteDotHints: record.blackWhiteDotHints || null,
        skyscraperClues: record.skyscraperClues || null
    };

    document.getElementById('viewPuzzleId').textContent = record.puzzleId;
    document.getElementById('viewPuzzleGameType').textContent = getGameTypeName(record.gameType);
    document.getElementById('viewPuzzleDifficultyType').textContent = getDifficultyTypeName(record.difficultyType);

    renderViewPuzzleBoard(record.originalPuzzle);

    // 激活题目标签
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn:first-child').classList.add('active');

    openModal('viewPuzzleModal');
}

/**
    * 切换查看题目/答案
    */
function switchViewPuzzleTab(tab) {
    if (!currentViewPuzzleData) return;

    // 更新标签状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 渲染对应内容
    if (tab === 'puzzle') {
        renderViewPuzzleBoard(currentViewPuzzleData.puzzle, false);
    } else {
        renderViewPuzzleBoard(currentViewPuzzleData.solution || currentViewPuzzleData.puzzle, true);
    }
}

/**
    * 渲染查看题目弹窗中的棋盘
    * @param {string} boardStr - 棋盘数据
    * @param {boolean} isAnswer - 是否是答案视图
    */
function renderViewPuzzleBoard(boardStr, isAnswer = false) {
    const boardContainer = document.getElementById('viewPuzzleBoard');
    const puzzle = currentViewPuzzleData.puzzle;
    const gameType = currentViewPuzzleData.gameType;
    const solution = currentViewPuzzleData.solution;
    const sandwichClues = currentViewPuzzleData.sandwichClues;

    const skyscraperClues = currentViewPuzzleData.skyscraperClues;

    // 摩天楼数独需要特殊布局（四个方向外部提示）
    if (gameType === 'SKYSCRAPER' && skyscraperClues) {
        renderViewSkyscraperPuzzle(boardContainer, boardStr, puzzle, skyscraperClues, isAnswer);
        return;
    }

    // 三明治数独需要特殊布局
    if (gameType === 'SANDWICH' && sandwichClues) {
        renderViewSandwichPuzzle(boardContainer, boardStr, puzzle, sandwichClues, isAnswer);
        return;
    }

    let html = '';

    // 根据字符串长度确定棋盘大小（更可靠）
    let gridSize = 9;
    if (boardStr.length === 16) {
        gridSize = 4;
    } else if (boardStr.length === 36) {
        gridSize = 6;
    }

    // 根据难度设置棋盘样式类
    let boardClass = '';
    if (gameType && gameType.startsWith('KILLER')) {
        boardClass = ' killer-board killer-' + gridSize + 'x' + gridSize;
    } else if (gameType === 'DIAGONAL') {
        boardClass = ' diagonal-board';
    } else if (gameType === 'ODD_EVEN') {
        boardClass = ' odd-even-board';
    } else if (gameType === 'IRREGULAR') {
        boardClass = ' irregular-board';
    } else if (gameType === 'WINDOKU') {
        boardClass = ' windoku-board';
    } else if (gameType === 'CENTER_DOT') {
        boardClass = ' center-dot-board';
    } else if (gameType === 'STAR') {
        boardClass = ' star-board';
    } else if (gameType === 'BLACK_WHITE_DOT') {
        boardClass = ' black-white-dot-board';
    } else if (gridSize === 4) {
        boardClass = ' mini-4-board';
    } else if (gridSize === 6) {
        boardClass = ' mini-6-board';
    }

    // 更新棋盘容器类名和网格列数
    boardContainer.className = 'view-puzzle-board' + boardClass;
    boardContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

    for (let i = 0; i < boardStr.length; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const value = boardStr[i];
        const isOriginal = puzzle && puzzle[i] !== '0'; // 题目原始数字
        const isEmpty = value === '0';

        // 添加样式类
        let cellClass = '';

        // 根据棋盘大小添加边框
        if (gameType === 'IRREGULAR') {
            // 锯齿数独无固定边框
        } else if (gridSize === 4) {
            // 4宫格 2x2
            if (col === 1 || col === 3) cellClass += ' border-right';
            if (row === 1 || row === 3) cellClass += ' border-bottom';
        } else if (gridSize === 6) {
            // 6宫格 2x3（每宫2行3列）
            if (col === 2 || col === 5) cellClass += ' border-right';
            if (row === 1 || row === 3) cellClass += ' border-bottom';
        } else {
            // 9宫格 3x3
            if (col === 2 || col === 5) cellClass += ' border-right';
            if (row === 2 || row === 5) cellClass += ' border-bottom';
        }

        // 对角线数独 - 对角线高亮
        if (gameType === 'DIAGONAL') {
            if (row === col || row + col === 8) {
                cellClass += ' diagonal-cell';
            }
        }

        // 奇偶数独 - 根据数字值判断奇偶
        if (gameType === 'ODD_EVEN') {
            const numValue = parseInt(solution[i]);
            if (numValue % 2 === 0) {
                cellClass += ' even-cell';
            } else {
                cellClass += ' odd-cell';
            }
        }

        // 窗口数独 - 窗口区域高亮
        if (gameType === 'WINDOKU') {
            const windokuRegions = [
                { startRow: 1, endRow: 3, startCol: 1, endCol: 3 },
                { startRow: 1, endRow: 3, startCol: 5, endCol: 7 },
                { startRow: 5, endRow: 7, startCol: 1, endCol: 3 },
                { startRow: 5, endRow: 7, startCol: 5, endCol: 7 }
            ];
            for (const region of windokuRegions) {
                if (row >= region.startRow && row <= region.endRow &&
                    col >= region.startCol && col <= region.endCol) {
                    cellClass += ' windoku-cell';
                    break;
                }
            }
        }

        // 中心点数独 - 中心点区域高亮
        if (gameType === 'CENTER_DOT') {
            if (row % 3 === 1 && col % 3 === 1) {
                cellClass += ' center-cell';
            }
        }

        // 星号数独 - 星形图案区域高亮
        if (gameType === 'STAR') {
            const starCells = [
                [1, 4], [2, 2], [2, 6], [4, 1], [4, 4], [4, 7], [6, 2], [6, 6], [7, 4]
            ];
            if (starCells.some(([sr, sc]) => sr === row && sc === col)) {
                cellClass += ' star-cell';
            }
        }

        // 锯齿数独 - 不规则宫格颜色
        if (gameType === 'IRREGULAR' && currentViewPuzzleData.irregularBoxes) {
            const boxIndex = getCellBoxIndex(row, col);
            cellClass += ` irregular-box-${boxIndex}`;
        }

        // 杀手数独 - 杀手笼样式
        if (gameType && gameType.startsWith('KILLER') && currentViewPuzzleData.cages) {
            const cageIndex = getCellCageIndex(row, col, gridSize);
            if (cageIndex >= 0) {
                const cage = currentViewPuzzleData.cages[cageIndex];
                const cageColorIndex = cageIndex % 25; // 循环使用25种颜色
                cellClass += ` killer-cage-${cageColorIndex}`;

                // 只在笼子的外边界添加边框
                if (cage && cage.cells && cage.cells.length > 0) {
                    let hasTop = true;
                    let hasBottom = true;
                    let hasLeft = true;
                    let hasRight = true;

                    for (const cell of cage.cells) {
                        if (cell.row === row - 1 && cell.col === col) hasTop = false;
                        if (cell.row === row + 1 && cell.col === col) hasBottom = false;
                        if (cell.row === row && cell.col === col - 1) hasLeft = false;
                        if (cell.row === row && cell.col === col + 1) hasRight = false;
                    }

                    if (hasTop) cellClass += ' killer-cage-border-top';
                    if (hasBottom) cellClass += ' killer-cage-border-bottom';
                    if (hasLeft) cellClass += ' killer-cage-border-left';
                    if (hasRight) cellClass += ' killer-cage-border-right';
                }
            }
        }

        // 获取笼和（在笼子左上角显示）
        let cageSum = '';
        if (gameType && gameType.startsWith('KILLER') && currentViewPuzzleData.cages) {
            const cageIndex = getCellCageIndex(row, col, gridSize);
            if (cageIndex >= 0) {
                const cage = currentViewPuzzleData.cages[cageIndex];
                if (cage && cage.cells && cage.cells.length > 0) {
                    const firstCell = cage.cells[0];
                    if (firstCell.row === row && firstCell.col === col) {
                        cageSum = cage.sum || '';
                    }
                }
            }
        }

        // 答案视图中区分原始数字和填入数字
        let numberClass = '';
        if (isAnswer) {
            if (isOriginal) {
                numberClass = ' original-number'; // 原始题目数字
            } else {
                numberClass = ' filled-number'; // 填入的数字
            }
        }

        html += `
            <div class="cell${isEmpty ? ' empty' : ''}${cellClass}">
                ${cageSum ? `<span class="cage-sum">${cageSum}</span>` : ''}
                <span class="${isEmpty ? '' : (isAnswer ? numberClass : 'fixed')}">${isEmpty ? '' : value}</span>
            </div>
        `;
    }

    boardContainer.innerHTML = html;

    // 渲染黑白点数独的点标记
    renderViewBlackWhiteDots(boardContainer, gameType);
}

/**
 * 渲染查看题目弹窗中的黑白点数独点标记
 */
function renderViewBlackWhiteDots(boardContainer, gameType) {
    if (gameType !== 'BLACK_WHITE_DOT') return;

    const dots = currentViewPuzzleData.blackWhiteDotHints;
    if (!dots || dots.length === 0) return;

    // 使用requestAnimationFrame确保DOM已完全渲染
    requestAnimationFrame(() => {
        const firstCell = boardContainer.querySelector('.cell');
        if (!firstCell) return;

        const cellRect = firstCell.getBoundingClientRect();
        const cellSize = cellRect.width;

        dots.forEach(dot => {
            const dotEl = document.createElement('div');
            dotEl.className = `view-dot-marker ${dot.type}`;

            let left, top;
            if (dot.direction === 'right') {
                left = (dot.col + 1) * cellSize + 0.5;
                top = (dot.row + 0.5) * cellSize + 0.5;
            } else {
                left = (dot.col + 0.5) * cellSize + 0.5;
                top = (dot.row + 1) * cellSize + 0.5;
            }

            dotEl.style.left = `${left}px`;
            dotEl.style.top = `${top}px`;
            boardContainer.appendChild(dotEl);
        });
    });
}

/**
    * 渲染三明治数独查看题目弹窗中的棋盘
    */
function renderViewSandwichPuzzle(boardContainer, boardStr, puzzle, sandwichClues, isAnswer) {
    // 添加三明治数独查看模式的类，覆盖默认grid样式
    boardContainer.className = 'view-puzzle-board sandwich-view-board';

    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'sandwich-layout';

    // 创建左上角空白占位
    const topLeftEmpty = document.createElement('div');
    topLeftEmpty.className = 'sandwich-top-left-empty';
    layout.appendChild(topLeftEmpty);

    // 创建顶部提示行
    const topClues = document.createElement('div');
    topClues.className = 'sandwich-clues-top';
    for (let col = 0; col < 9; col++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.left[col] || 0;
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建左侧提示列
    const leftClues = document.createElement('div');
    leftClues.className = 'sandwich-clues-left';
    for (let row = 0; row < 9; row++) {
        const clue = document.createElement('div');
        clue.className = 'sandwich-clue';
        clue.textContent = sandwichClues.top[row] || 0;
        leftClues.appendChild(clue);
    }
    layout.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-sandwich';

    for (let i = 0; i < boardStr.length; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const value = boardStr[i];
        const isOriginal = puzzle && puzzle[i] !== '0';
        const isEmpty = value === '0';

        let cellClass = '';

        // 宫格边框
        if (col === 2 || col === 5) cellClass += ' border-right';
        if (row === 2 || row === 5) cellClass += ' border-bottom';

        // 答案视图中区分原始数字和填入数字
        let numberClass = '';
        if (isAnswer) {
            if (isOriginal) {
                numberClass = ' original-number';
            } else {
                numberClass = ' filled-number';
            }
        }

        const cell = document.createElement('div');
        cell.className = `cell${isEmpty ? ' empty' : ''}${cellClass}`;

        const span = document.createElement('span');
        span.className = isEmpty ? '' : (isAnswer ? numberClass : 'fixed');
        span.textContent = isEmpty ? '' : value;
        cell.appendChild(span);

        board.appendChild(cell);
    }

    layout.appendChild(board);
    boardContainer.innerHTML = '';
    boardContainer.appendChild(layout);
}

/**
    * 渲染摩天楼数独查看题目弹窗中的棋盘
    */
function renderViewSkyscraperPuzzle(boardContainer, boardStr, puzzle, skyscraperClues, isAnswer) {
    // 添加摩天楼数独查看模式的类，覆盖默认grid样式
    boardContainer.className = 'view-puzzle-board skyscraper-view-board';

    // 创建整体布局容器
    const layout = document.createElement('div');
    layout.className = 'skyscraper-layout';

    // 创建顶部提示行（11个元素，首尾为空）
    const topClues = document.createElement('div');
    topClues.className = 'skyscraper-clues-top';
    for (let col = 0; col < skyscraperClues.top.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.top[col] || '';
        topClues.appendChild(clue);
    }
    layout.appendChild(topClues);

    // 创建中间行（左侧提示 + 棋盘 + 右侧提示）
    const middleRow = document.createElement('div');
    middleRow.className = 'skyscraper-middle-row';

    // 创建左侧提示列（11个元素，首尾为空）
    const leftClues = document.createElement('div');
    leftClues.className = 'skyscraper-clues-left';
    for (let row = 0; row < skyscraperClues.left.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.left[row] || '';
        leftClues.appendChild(clue);
    }
    middleRow.appendChild(leftClues);

    // 创建数独棋盘
    const board = document.createElement('div');
    board.className = 'sudoku-board game-type-skyscraper';

    for (let i = 0; i < boardStr.length; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const value = boardStr[i];
        const isOriginal = puzzle && puzzle[i] !== '0';
        const isEmpty = value === '0';

        let cellClass = '';

        // 宫格边框
        if (col === 2 || col === 5) cellClass += ' border-right';
        if (row === 2 || row === 5) cellClass += ' border-bottom';

        // 答案视图中区分原始数字和填入数字
        let numberClass = '';
        if (isAnswer) {
            if (isOriginal) {
                numberClass = ' original-number';
            } else {
                numberClass = ' filled-number';
            }
        }

        const cell = document.createElement('div');
        cell.className = `cell${isEmpty ? ' empty' : ''}${cellClass}`;

        const span = document.createElement('span');
        span.className = isEmpty ? '' : (isAnswer ? numberClass : 'fixed');
        span.textContent = isEmpty ? '' : value;
        cell.appendChild(span);

        board.appendChild(cell);
    }
    middleRow.appendChild(board);

    // 创建右侧提示列（11个元素，首尾为空）
    const rightClues = document.createElement('div');
    rightClues.className = 'skyscraper-clues-right';
    for (let row = 0; row < skyscraperClues.right.length; row++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.right[row] || '';
        rightClues.appendChild(clue);
    }
    middleRow.appendChild(rightClues);

    layout.appendChild(middleRow);

    // 创建底部提示行（11个元素，首尾为空）
    const bottomClues = document.createElement('div');
    bottomClues.className = 'skyscraper-clues-bottom';
    for (let col = 0; col < skyscraperClues.bottom.length; col++) {
        const clue = document.createElement('div');
        clue.className = 'skyscraper-clue';
        clue.textContent = skyscraperClues.bottom[col] || '';
        bottomClues.appendChild(clue);
    }
    layout.appendChild(bottomClues);

    boardContainer.innerHTML = '';
    boardContainer.appendChild(layout);
}

/**
    * 获取单元格所属的不规则宫格索引
    */
function getCellBoxIndex(row, col) {
    if (!currentViewPuzzleData.irregularBoxes) return 0;
    for (let i = 0; i < currentViewPuzzleData.irregularBoxes.length; i++) {
        const box = currentViewPuzzleData.irregularBoxes[i];
        if (box.some(([r, c]) => r === row && c === col)) {
            return i;
        }
    }
    return 0;
}

/**
    * 获取单元格所属的杀手笼索引
    */
function getCellCageIndex(row, col, gridSize) {
    if (!currentViewPuzzleData.cages || !Array.isArray(currentViewPuzzleData.cages)) return -1;
    const index = row * gridSize + col;
    for (let i = 0; i < currentViewPuzzleData.cages.length; i++) {
        const cage = currentViewPuzzleData.cages[i];
        // 杀手数独的cages是对象结构：{cells: [{row, col}, ...], sum: X}
        if (cage && cage.cells && Array.isArray(cage.cells)) {
            const cellIndex = cage.cells.findIndex(cell => cell.row === row && cell.col === col);
            if (cellIndex >= 0) {
                return i;
            }
        }
    }
    return -1;
}

/**
    * 格式化日期时间（原函数）
    */
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

// ==================== 记录页面函数 ====================

/**
    * 加载记录
    */
function loadRecords(filter = 'ALL') {
    const records = Storage.getRecords();
    const tbody = document.getElementById('recordsBody');
    const emptyState = document.getElementById('emptyState');

    // 筛选记录
    const filteredRecords = filter === 'ALL'
        ? records
        : records.filter(r => r.gameType === filter);

    // 更新统计
    const totalGames = records.length;
    const completedGames = records.filter(r => r.isCompleted && !r.isAbandoned).length;
    const totalTime = records.reduce((sum, r) => sum + (r.completionTime || 0), 0);

    document.getElementById('totalGames').textContent = totalGames;
    document.getElementById('completedGames').textContent = completedGames;
    document.getElementById('totalTime').textContent = formatTime(totalTime);

    if (filteredRecords.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('recordsTable').style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    document.getElementById('recordsTable').style.display = 'table';
    emptyState.style.display = 'none';

    // 按ID倒序排列
    filteredRecords.sort((a, b) => b.puzzleId - a.puzzleId);

    const latestInProgress = filteredRecords.find(r => !r.isCompleted && !r.isAbandoned);

    tbody.innerHTML = filteredRecords.map(record => {
        const isLatestInProgress = latestInProgress && record.puzzleId === latestInProgress.puzzleId;
        const canContinue = isLatestInProgress;
        const canView = record.isCompleted && record.solution;
        const statusText = record.isAbandoned ? '已放弃' : (record.isCompleted ? '已完成' : '进行中');
        const statusClass = record.isAbandoned ? 'abandoned' : (record.isCompleted ? 'completed' : 'in-progress');

        const startTimeText = record.startTime ? formatDateTime(record.startTime) : '--';
        const duration = record.isCompleted ? (record.completionTime || 0) : (record.elapsedTime || 0);
        const durationText = formatTime(duration);

        return `
            <tr>
                <td>#${record.puzzleId}</td>
                <td><span class="gameType-badge ${record.gameType.toLowerCase()}">${getGameTypeName(record.gameType)}</span></td>
                <td>${getDifficultyTypeName(record.difficultyType)}</td>
                <td>${startTimeText}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${durationText}</td>
                <td>${canContinue ? '<button class="action-btn" onclick="continuePuzzle(' + record.puzzleId + ', \'' + record.gameType + '\')">继续</button>' : (canView ? '<button class="action-btn view-btn" onclick="viewPuzzle(' + record.puzzleId + ')">查看题目</button>' : '-')}</td>
            </tr>
        `;
    }).join('');
}

/**
    * 筛选记录
    */
function filterRecords(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadRecords(filter);
}

/**
    * 检查是否有未完成的游戏
    */
function hasInProgressGame() {
    const records = Storage.getRecords();
    return records.some(r => !r.isCompleted && !r.isAbandoned);
}

/**
    * 获取最新的未完成游戏
    */
function getLatestInProgressGame() {
    const records = Storage.getRecords();
    const inProgress = records.filter(r => !r.isCompleted && !r.isAbandoned);
    if (inProgress.length === 0) return null;
    return inProgress.reduce((latest, current) =>
        current.puzzleId > latest.puzzleId ? current : latest
    );
}

/**
    * 继续最新的游戏
    */
function continueLatestGame() {
    const record = getLatestInProgressGame();
    if (record) {
        continuePuzzle(record.puzzleId, record.gameType);
    }
}

/**
    * 清除进度并显示难度选择
    */
function clearProgressAndShowGameType() {
    const record = getLatestInProgressGame();
    if (record) {
        record.isAbandoned = true;
        record.isCompleted = true;
        Storage.saveRecord(record);
    }
    showGameTypeSection();
}

/**
    * 显示难度选择区域
    */
function showGameTypeSection() {
    document.getElementById('continueGameSection').style.display = 'none';
    document.getElementById('gameTypeSelectionSection').style.display = 'block';
}

/**
    * 显示继续游戏区域
    */
function showContinueGameSection() {
    document.getElementById('continueGameSection').style.display = 'block';
    document.getElementById('gameTypeSelectionSection').style.display = 'none';
}

/**
    * 放弃游戏
    */
function abandonGame() {
    if (!confirm('确定要放弃这局游戏吗？放弃后将无法继续。')) {
        return;
    }

    if (currentPuzzle) {
        const record = Storage.getRecord(currentPuzzle.id);
        if (record) {
            record.completionTime = seconds;
            record.isAbandoned = true;
            record.isCompleted = true;
            Storage.saveRecord(record);
        }
    }

    stopTimer();
    goHome();
}

/**
 * 继续题目（拆分页面专用）
 */
function continuePuzzle(puzzleId, gameType) {
    // 存起来，跳过去再恢复
    localStorage.setItem("currentGameType", gameType);
    localStorage.setItem("continuePuzzleId", puzzleId);

    // 跳转到游戏页，不再操作 DOM
    location.href = "game.html";
}

/**
    * 恢复游戏状态
    */
function restoreGameState(record) {
    // 根据难度确定棋盘尺寸
    let boardSize = 9;
    if (record.gameType === 'MINI_4x4' || record.gameType === 'KILLER_4x4') {
        boardSize = 4;
    } else if (record.gameType === 'MINI_6x6' || record.gameType === 'KILLER_6x6') {
        boardSize = 6;
    }

    // 根据难度确定游戏类型
    let gameTypeStr = 'STANDARD';
    if (record.gameType === 'DIAGONAL') {
        gameTypeStr = 'DIAGONAL';
    } else if (record.gameType === 'ODD_EVEN') {
        gameTypeStr = 'ODD_EVEN';
    } else if (record.gameType === 'KILLER_4x4' || record.gameType === 'KILLER_6x6' || record.gameType === 'KILLER_9x9') {
        gameTypeStr = 'KILLER';
    } else if (record.gameType === 'IRREGULAR') {
        gameTypeStr = 'IRREGULAR';
    } else if (record.gameType === 'WINDOKU') {
        gameTypeStr = 'WINDOKU';
    } else if (record.gameType === 'SANDWICH') {
        gameTypeStr = 'SANDWICH';
    } else if (record.gameType === 'CENTER_DOT') {
        gameTypeStr = 'CENTER_DOT';
    } else if (record.gameType === 'STAR') {
        gameTypeStr = 'STAR';
    } else if (record.gameType === 'BLACK_WHITE_DOT') {
        gameTypeStr = 'BLACK_WHITE_DOT';
    } else if (record.gameType === 'SKYSCRAPER') {
        gameTypeStr = 'SKYSCRAPER';
    }

    // 恢复题目信息
    currentPuzzle = {
        id: record.puzzleId,
        puzzle: record.originalPuzzle || record.currentBoard.replace(/[^0]/g, '0'), // 如果没有原始题目，用当前状态生成
        solution: record.solution || '',
        gameType: record.gameType,
        difficultyType: record.difficultyType,
        size: boardSize,
        gameTypeStr: gameTypeStr,
        oddEvenMarks: record.oddEvenMarks || null,
        cages: record.cages || null,
        irregularBoxes: record.irregularBoxes || null,
        sandwichClues: record.sandwichClues || null,
        blackWhiteDotHints: record.blackWhiteDotHints || null,
        skyscraperClues: record.skyscraperClues || null
    };

    // 恢复棋盘状态（支持JSON格式的候选数字）
    let boardData;
    try {
        // 尝试解析JSON格式（支持候选数字数组）
        boardData = JSON.parse(record.currentBoard);
    } catch (e) {
        // 如果不是JSON格式，使用字符串格式
        boardData = record.currentBoard;
    }

    // 恢复原始题目
    if (record.originalPuzzle) {
        originalPuzzle = record.originalPuzzle;
    } else if (Array.isArray(boardData)) {
        // 从JSON数组中提取原始题目
        originalPuzzle = boardData.map(cell =>
            typeof cell === 'number' && cell !== 0 ? cell : 0
        ).join('');
    } else {
        // 旧格式字符串
        originalPuzzle = record.currentBoard.replace(/[^0-9]/g, '0');
    }

    // 恢复当前棋盘状态
    if (Array.isArray(boardData)) {
        currentBoard = boardData;
    } else {
        // 旧格式解析
        currentBoard = boardData.split('').map(c => {
            const num = parseInt(c);
            return num === 0 ? [] : num;
        });
    }

    // 恢复尝试次数和最佳成绩
    attemptCount = record.attemptCount || 1;
    bestTime = record.bestTime;

    // 恢复计时器
    seconds = record.elapsedTime || 0;

    // 更新显示
    document.getElementById('puzzleNumber').textContent = `题目 #${record.puzzleId}`;
    document.getElementById('attemptInfo').textContent = `第 ${attemptCount} 次尝试`;

    if (bestTime) {
        document.getElementById('bestTimeInfo').style.display = 'block';
        document.getElementById('bestTime').textContent = formatTime(bestTime);
    } else {
        document.getElementById('bestTimeInfo').style.display = 'none';
    }

    // 渲染棋盘
    renderBoard();

    // 启动计时器（从保存的时间继续）
    startTimer(seconds);
}

// ==================== 弹窗函数 ====================

const helpContent = {
    STANDARD: {
        title: '标准数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    DIAGONAL: {
        title: '对角线数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '两条对角线上的数字也不能重复（1-9各出现一次）',
            '初始数字为固定提示，不能修改'
        ]
    },
    ODD_EVEN: {
        title: '奇偶数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '浅色格子只能填奇数（1、3、5、7、9）',
            '深色格子只能填偶数（2、4、6、8）',
            '初始数字为固定提示，不能修改'
        ]
    },
    KILLER: {
        title: '杀手数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '虚线围成的笼内数字相加等于左上角的提示数',
            '每个笼内的数字不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    MINI_4x4: {
        title: '迷你4×4数独',
        rules: [
            '在4×4的方格内填入1-4的数字',
            '每行、每列、每个2×2的小方格内都不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    MINI_6x6: {
        title: '迷你6×6数独',
        rules: [
            '在6×6的方格内填入1-6的数字',
            '每行、每列、每个2×3的小方格内都不能重复',
            '初始数字为固定提示，不能修改'
        ]
    },
    IRREGULAR: {
        title: '锯齿数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列的数字都不能重复（1-9各出现一次）',
            '每个不规则形状的宫格内数字也不能重复（1-9各出现一次）',
            '不同颜色的区域代表不同的不规则宫格',
            '初始数字为固定提示，不能修改'
        ]
    },
    WINDOKU: {
        title: '窗口数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '四个额外的3×3阴影窗口区域内数字也不能重复',
            '四个窗口位于棋盘中心区域（行2-4列2-4、行2-4列6-8、行6-8列2-4、行6-8列6-8）',
            '阴影区域中的单元格同时属于四个单元（行、列、宫、窗口）',
            '初始数字为固定提示，不能修改'
        ]
    },
    SANDWICH: {
        title: '三明治数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '数字1和9充当"面包"，位于三明治的两端',
            '棋盘外部的提示数字表示该行/列中严格位于1和9之间的所有数字之和',
            '如果提示为0，说明1和9必须相邻',
            '如果提示为35，说明1和9必须位于两端（因为2-8的和为35）',
            '初始数字为固定提示，不能修改'
        ]
    },
    CENTER_DOT: {
        title: '中心点数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '中心点约束：存在由九个3x3块的正中心单元格组成的第十个“额外”区域。',
            '额外区域完成：这个高亮显示的九个中心单元格集合也必须包含数字1到9各一次。',
            '初始数字为固定提示，不能修改'
        ]
    },
    STAR: {
        title: '星号数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '星号约束：九个特定的阴影单元格（在网格中形成星形图案）也必须恰好包含数字1到9各一次。',
            '交叉逻辑：填入星号单元格的数字必须同时满足四个约束：其所在行、所在列、所在3x3宫以及星号集合本身。',
            '初始数字为固定提示，不能修改'
        ]
    },
    BLACK_WHITE_DOT: {
        title: '黑白点数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '白点表示相邻两格数字相差1（如3和4、7和8）',
            '黑点表示相邻两格数字为两倍关系（如2和4、3和6）',
            '1和2之间可能是白点也可能是黑点（因为既相差1又是两倍关系）',
            '没有标记点的相邻格子不能有上述关系',
            '初始数字为固定提示，不能修改'
        ]
    },
    SKYSCRAPER: {
        title: '摩天楼数独',
        rules: [
            '在9×9的方格内填入1-9的数字',
            '每行、每列、每个3×3的小方格内都不能重复',
            '每个单元格中的数字代表摩天楼的高度',
            '网格外部的提示表示从该视角可以看到多少栋建筑物。例如：从某方向看到3，表示能看到3栋楼房',
            '只有当所有前面的建筑物都矮于它时，该建筑物才是可见的。较高的建筑物总是遮挡其后面的较矮建筑物。',
            '初始数字为固定提示，不能修改'
        ]
    }
};

function getGameHelpContent(gameTypeStr) {
    const info = helpContent[gameTypeStr] || helpContent.STANDARD;
    let html = `<h3>【${info.title}】游戏规则：</h3><ul>`;
    info.rules.forEach(rule => {
        html += `<li>${rule}</li>`;
    });
    html += '</ul>';
    return html;
}

/**
    * 显示帮助弹窗
    */
function showHelp() {
    const gameTypeStr = currentPuzzle.gameTypeStr || 'STANDARD';
    const helpHtml = getGameHelpContent(gameTypeStr);

    const commonHelp = `
        <h3>操作说明：</h3>
        <ul>
            <li>点击方格选中位置</li>
            <li>使用下方数字键盘输入数字</li>
            <li>点击 ✕ 清除当前格子的数字</li>
            <li>全部空格填满后自动验证答案</li>
        </ul>
        <h3>草稿模式：</h3>
        <ul>
            <li>点击"确定模式/草稿模式"按钮切换输入模式</li>
            <li><strong>确定模式</strong>：直接填入确定的数字</li>
            <li><strong>草稿模式</strong>：在格子中标记候选数字</li>
            <li>在草稿模式下，点击数字添加/移除候选</li>
            <li>确定数字会自动删除同行/列/宫的重复候选</li>
        </ul>
        <h3>候选数字样式：</h3>
        <ul>
            <li><strong>彩色背景</strong>：表示该候选数字目前是已标记候选数字中的唯一可能</li>
            <li><strong>白色背景</strong>：表示该候选数字在同行/列/宫中多次出现</li>
        </ul>
        <h3>快捷键：</h3>
        <ul>
            <li>数字键 1-9：填入数字</li>
            <li>Delete/Backspace：清除数字</li>
            <li>方向键：移动选中格</li>
            <li>E键：切换确定/草稿模式</li>
        </ul>
    `;

    document.querySelector('#helpModal .help-content').innerHTML = helpHtml + commonHelp;
    document.getElementById('helpModal').style.display = 'block';
}

/**
    * 打开弹窗
    */
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

/**
    * 关闭弹窗
    */
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

/**
 * 显示9宫格难度选择弹窗
 */
function showDifficultyModal(gameType) {
    currentGameType = gameType;
    openModal('DifficultyModal');
}

/**
 * 关闭9宫格难度选择弹窗
 */
function closeDifficultyModal() {
    closeModal('DifficultyModal');
}

// 点击弹窗外部关闭
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ==================== 键盘事件 ====================
document.addEventListener('keydown', function (event) {
    // 数字键1-9
    if (event.key >= '1' && event.key <= '9') {
        selectNumber(parseInt(event.key));
    }
    // 删除键
    else if (event.key === 'Delete' || event.key === 'Backspace') {
        selectNumber(0);
    }
    // E键切换输入模式（确定模式/草稿模式）
    else if (event.key === 'e' || event.key === 'E') {
        toggleInputMode();
    }
    // 方向键移动
    else if (selectedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        let { row, col } = selectedCell;
        const size = currentPuzzle.size || 9;

        switch (event.key) {
            case 'ArrowUp': row = Math.max(0, row - 1); break;
            case 'ArrowDown': row = Math.min(size - 1, row + 1); break;
            case 'ArrowLeft': col = Math.max(0, col - 1); break;
            case 'ArrowRight': col = Math.min(size - 1, col + 1); break;
        }

        const cells = initCellsCache();
        const newIndex = row * size + col;
        selectCell(row, col, cells[newIndex]);
    }
    // ESC关闭弹窗
    else if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});