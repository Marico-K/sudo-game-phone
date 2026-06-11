# 数独游戏项目 Code Wiki

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目架构](#3-项目架构)
4. [模块说明](#4-模块说明)
5. [核心类与函数说明](#5-核心类与函数说明)
6. [API接口文档](#6-api接口文档)
7. [数据库设计](#7-数据库设计)
8. [前端页面说明](#8-前端页面说明)
9. [依赖关系](#9-依赖关系)
10. [项目运行方式](#10-项目运行方式)

---

## 1. 项目概述

### 1.1 项目简介

本项目是一个基于Web的数独游戏应用，采用前后端分离的架构设计。数独是一种经典的逻辑推理游戏，玩家需要在9×9的方格内填入数字1-9，使得每行、每列以及每个3×3的小宫格内都不出现重复数字。

### 1.2 核心功能

项目提供了以下核心功能模块：

**游戏功能**涵盖三个难度等级的数独题目体验。简单难度包含35个空格，适合新手入门；中等难度设置45个空格，提供适度挑战；高级难度则包含55个空格，为高手玩家准备极具挑战性的谜题。每个难度等级配备50道独特题目，玩家可以自由选择关卡进行挑战。

**赛季系统**实现了题目的周期性更新机制。每30天自动生成新赛季，管理员也可手动触发重新生成。系统采用逻辑删除方式保留历史赛季数据，确保已完成的游戏记录得以完整保存。

**用户系统**基于会话ID实现匿名用户管理。玩家首次访问时自动生成唯一会话标识，通过Cookie和LocalStorage双重存储确保跨页面访问的连续性。系统支持会话导入导出功能，方便玩家在不同设备间同步游戏进度。

**记录系统**详细追踪玩家的游戏历程。包括每道题目的尝试次数、最佳成绩、完成时间等关键指标，支持按难度等级筛选查看。所有记录永久保存在数据库中，形成玩家的游戏成长档案。

---

## 2. 技术栈

### 2.1 后端技术

**Spring Boot 3.2.0** 作为核心框架，提供了开箱即用的应用配置和自动装配能力。版本3.2.0支持Java 17特性，并集成了最新的Web开发最佳实践。

**Spring Web** 提供了RESTful风格的Web服务开发能力。通过`@RestController`和`@RequestMapping`注解，可以快速构建HTTP接口。内置的请求参数绑定、响应处理、异常映射等功能大大简化了Web开发工作。

**Spring Data JPA** 实现了数据持久化层的标准化封装。继承`JpaRepository`接口即可获得CRUD操作、分页查询、自定义查询方法等能力。配合Hibernate作为JPA实现，提供了强大的对象关系映射功能。

**H2 Database** 作为嵌入式数据库，用于开发和测试环境的数据存储。采用文件模式持久化数据，配置简单且支持SQL标准。数据库文件存储在`data/sudokudb.mv.db`路径下。

### 2.2 前端技术

**Thymeleaf** 作为模板引擎，实现了服务端渲染的Web页面。通过注解语法可以在HTML中嵌入后端数据，支持布局复用、国际化等高级特性。开发模式下禁用缓存，便于实时预览页面修改效果。

**原生JavaScript** 承担了前端交互逻辑的实现。包含棋盘渲染、用户输入处理、计时器控制、API调用等核心功能。不依赖任何前端框架，保持了代码的轻量化和可维护性。

**CSS3** 负责页面样式和响应式布局。实现了黑色边框的极简设计风格，支持从桌面到手机的全设备适配。关键样式包括9×9棋盘网格布局、单元格高亮效果、按钮交互状态等。

### 2.3 构建工具

**Maven** 作为项目管理和构建工具，负责依赖管理、编译打包、运行测试等生命周期管理。项目通过`pom.xml`配置文件声明所有依赖，Maven自动处理依赖传递和版本冲突问题。

---

## 3. 项目架构

### 3.1 分层架构

项目采用经典的三层架构设计，从上至下依次为Web层、服务层和数据层。每一层都有明确的职责边界，通过依赖注入实现层间解耦。

```
┌─────────────────────────────────────────────────┐
│                   Web Layer                      │
│  ┌─────────────┬──────────────┬───────────────┐ │
│  │WebController│GameController│SeasonController│ │
│  └─────────────┴──────────────┴───────────────┘ │
├─────────────────────────────────────────────────┤
│                  Service Layer                   │
│  ┌─────────────┬──────────────┬───────────────┐ │
│  │ GameService │SudokuService │ SeasonService  │ │
│  └─────────────┴──────────────┴───────────────┘ │
├─────────────────────────────────────────────────┤
│                 Repository Layer                 │
│  ┌────────────────┬────────────────┬───────────┐ │
│  │SudokuPuzzle   │  UserRecord    │SeasonConfig│ │
│  │  Repository   │  Repository   │ Repository│ │
│  └────────────────┴────────────────┴───────────┘ │
├─────────────────────────────────────────────────┤
│                    Model Layer                    │
│  ┌────────────────┬────────────────┬───────────┐ │
│  │  SudokuPuzzle  │  UserRecord    │SeasonConfig│ │
│  └────────────────┴────────────────┴───────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
g:\GIT\sudo-game-phone\
├── src\main\java\com\sudoku\
│   ├── SudokuGameApplication.java     # Spring Boot应用入口
│   ├── controller\                    # Web控制器层
│   │   ├── WebController.java         # 页面路由控制器
│   │   ├── GameController.java        # 游戏业务接口控制器
│   │   └── SeasonController.java      # 赛季管理接口控制器
│   ├── service\                        # 业务逻辑层
│   │   ├── GameService.java           # 游戏核心业务逻辑
│   │   ├── SudokuService.java         # 数独验证工具服务
│   │   └── SeasonService.java         # 赛季管理业务逻辑
│   ├── model\                         # 数据实体层
│   │   ├── SudokuPuzzle.java          # 数独题目实体
│   │   ├── UserRecord.java            # 用户记录实体
│   │   └── SeasonConfig.java          # 赛季配置实体
│   ├── repository\                    # 数据访问层
│   │   ├── SudokuPuzzleRepository.java
│   │   ├── UserRecordRepository.java
│   │   └── SeasonConfigRepository.java
│   ├── dto\                           # 数据传输对象
│   │   └── GameStartRequest.java
│   └── data\                          # 数据初始化
│       └── SudokuDataInitializer.java
├── src\main\resources\
│   ├── templates\                      # Thymeleaf模板
│   │   ├── index.html                 # 首页（难度选择）
│   │   ├── game.html                  # 游戏页面
│   │   ├── puzzle-select.html         # 关卡选择页面
│   │   └── records.html               # 记录查看页面
│   ├── static\css\
│   │   └── style.css                  # 全局样式表
│   └── application.properties         # 应用配置
├── data\                              # H2数据库文件
│   ├── sudokudb.mv.db
│   └── sudokudb.trace.db
└── pom.xml                            # Maven配置
```

---

## 4. 模块说明

### 4.1 Controller层模块

**WebController** 负责处理页面路由请求。该控制器将HTTP GET请求映射到对应的Thymeleaf模板，返回HTML页面供浏览器渲染。包含四个路由映射：根路径返回首页模板、游戏页面路由、记录查看路由、以及关卡选择路由。

**GameController** 处理游戏相关的API请求。采用RESTful设计原则，通过`@RestController`注解自动将返回值序列化为JSON格式。跨域配置允许来自任意域的前端请求。核心功能包括用户会话管理、题目获取、游戏状态记录和答案验证。

**SeasonController** 专注于赛季管理功能。目前提供三个接口：获取当前赛季信息、获取所有赛季历史、以及手动触发新赛季生成。这些接口主要用于后台管理和系统维护场景。

### 4.2 Service层模块

**GameService** 是游戏业务的核心服务类。负责处理用户会话创建、题目随机选取、游戏状态跟踪、成绩记录更新等核心业务流程。该服务依赖SudokuPuzzleRepository和UserRecordRepository进行数据持久化操作。

**SudokuService** 提供数独验证的纯工具方法集。不涉及数据库操作，仅包含棋盘状态验证、格式转换等静态逻辑。核心方法包括检查数独有效性、判断棋盘是否完整、验证填入位置的安全性等。

**SeasonService** 管理赛季的生命周期。负责在应用启动时检查并初始化赛季，生成新赛季的数独题目集。核心算法包括回溯法生成完整数独、挖空算法生成唯一解谜题、解计数剪枝优化等。

### 4.3 Repository层模块

**SudokuPuzzleRepository** 继承JpaRepository，提供数独题目的数据访问能力。自定义查询方法支持按难度等级筛选、按编号精确查询、以及逻辑删除状态过滤。所有查询默认排除已删除的题目记录。

**UserRecordRepository** 管理用户游戏记录的数据访问。与SudokuPuzzle实体存在多对一关联关系，通过JOIN FETCH实现关联数据的预加载，避免N+1查询问题。查询方法支持按会话ID、题目ID、完成状态等多种条件组合。

**SeasonConfigRepository** 提供赛季配置的数据访问接口。查询方法设计简洁，主要用于获取最新赛季和历史赛季列表。

### 4.4 Model层模块

**SudokuPuzzle** 是数独题目的JPA实体类。存储题目字符串和对应答案，采用81位字符串格式表示9×9棋盘。使用枚举类型定义三个难度等级，通过逻辑删除标志实现数据的软删除机制。

**UserRecord** 记录用户的游戏历程。一个用户可以在同一道题目上进行多次尝试，系统记录尝试次数、最佳成绩、完成时间等关键指标。通过ManyToOne关联指向对应的数独题目实体。

**SeasonConfig** 保存赛季的配置信息。每个赛季包含创建时间戳和下次自动更新的计划时间。手动触发和自动触发的赛季通过布尔标志进行区分。

---

## 5. 核心类与函数说明

### 5.1 应用入口类

**SudokuGameApplication** 是Spring Boot应用的启动类。使用`@SpringBootApplication`注解标记为自动配置的主类，包含应用上下文配置、组件扫描和自动装配三大功能。main方法调用`SpringApplication.run()`启动嵌入式的Tomcat服务器，默认监听8081端口。

### 5.2 游戏控制器详解

**GameController** 提供完整的游戏API接口，所有接口均支持跨域请求。

`createSession()` 方法处理用户首次访问的场景。当Cookie和LocalStorage中都不存在会话ID时，前端会调用此接口创建新会话。方法返回一个UUID格式的会话标识，并通过HTTP头设置Cookie。Cookie配置为1年有效期，采用LaxSameSite策略确保跨站请求的可携带性。

`getPuzzlesByDifficulty()` 方法接收难度等级作为路径参数，返回该难度下的所有可用题目列表。难度参数会被转换为枚举类型，如果传入无效值将抛出异常。

`getRandomPuzzle()` 方法返回指定难度的随机一道题目。如果该难度下没有可用题目，会抛出RuntimeException异常告知调用方。

`startGame()` 方法在用户开始尝试某道题目时调用。如果用户此前已有该题目的记录，则累加尝试次数；否则创建全新的游戏记录。方法返回更新后的UserRecord对象。

`completeGame()` 方法处理游戏完成的逻辑。接收到用户提交的完成时间后，系统判断本次成绩是否为最佳，并更新记录状态。该方法使用@Transactional注解确保数据库操作的原子性。

`validateSolution()` 方法用于前端实时验证用户输入的正确性。接受用户当前棋盘状态和标准答案作为参数，返回布尔值表示是否匹配。

`validatePartialSolution()` 方法检查用户填入的数字是否与原题目产生冲突。即用户不能修改题目中已有的提示数字，且不能产生数独规则禁止的重复。

### 5.3 游戏服务详解

**GameService** 实现了游戏的核心业务逻辑，依赖Spring的依赖注入机制获取所需的Repository实例。

`createSession()` 方法使用UUID.randomUUID()生成唯一的会话标识。UUID保证在全球范围内的唯一性，适合作为用户身份识别的长ID。

`getRandomPuzzle()` 方法从数据库中查询指定难度的可用题目列表，然后使用Random类的nextInt方法选取随机下标。查询结果排除了已逻辑删除的题目。

`startGame()` 方法的实现体现了状态管理的逻辑。首先尝试查找用户在该题目上是否已有记录，如有则更新尝试次数，否则创建新记录。赛季编号从题目实体继承而来。

`completeGame()` 方法处理成绩提交。判断逻辑优先考虑最佳成绩：如果本次时间短于历史最佳，则更新bestTime字段并标记isBestTime为true；否则保留原最佳成绩。

`validatePartialSolution()` 方法先将字符串格式的棋盘转换为二维数组，然后检查用户输入区域与原题目的兼容性。核心验证逻辑委托给SudokuService完成。

`formatTime()` 方法将秒数格式化为MM:SS的时间字符串，使用String.format确保分钟和秒数都保持两位显示。

### 5.4 数独服务详解

**SudokuService** 提供了纯函数式的数独验证工具集，所有方法都是无状态的。

`isValidSudoku()` 方法从行、列、宫三个维度验证数独的有效性。遍历81个单元格，使用布尔数组记录已出现的数字，遇到重复则立即返回false。

`isValidRow()`、`isValidColumn()`、`isValidBox()` 分别是三个验证维度的方法实现。Box验证需要根据传入的起始行列计算当前单元格所在的3×3宫格位置。

`isComplete()` 方法首先检查是否存在空格（值为0的单元格），然后调用isValidSudoku确认棋盘合法性。完整的数独必须同时满足填满和有效两个条件。

`isSafe()` 方法判断在指定位置填入指定数字后，棋盘是否仍然满足数独规则。该方法在生成数独的递归回溯过程中被频繁调用。

`stringToBoard()` 方法将81位字符串转换为9×9二维数组。字符串中0表示空格，1-9表示已填数字。转换时使用Character.getNumericValue获取字符的数值。

`boardToString()` 方法是stringToBoard的逆操作，将二维数组拼接为81位字符串。

### 5.5 赛季服务详解

**SeasonService** 负责数独题目的生成和管理，是系统初始化阶段的核心组件。

`initializeSeasonIfNeeded()` 方法在应用启动时被调用。它检查当前是否存在赛季配置，如果不存在或已到自动更新时间，则创建新赛季。该方法通过CommandLineRunner机制在应用完全启动后执行。

`createNewSeason()` 方法执行赛季创建的核心流程。首先将所有旧题目标记为已删除，然后按三种难度等级分别生成题目，每种难度50道，最后保存新的赛季配置记录。

`generatePuzzles()` 方法批量生成指定难度的数独题目。对于每个题目，先用回溯算法生成完整的数独终盘，再通过挖空算法生成题目。挖空过程会验证唯一解，确保每道题目都有且仅有一个正确答案。

`generateFullBoard()` 方法使用递归回溯填充完整的数独终盘。从左上角开始，逐行逐列填入数字，使用洗牌后的数字序列保证生成结果的随机性。

`createPuzzle()` 方法通过挖空生成数独题目。首先复制完整终盘，然后随机选择位置挖空。关键是要保证挖空后的题目仍有唯一解。算法会测试每个挖空位置，如果导致多解则回填该位置。

`getSolutionCount()` 方法使用剪枝优化的回溯算法统计解的数量。当找到两个或更多解时立即停止，因为我们的目标是验证唯一解而非枚举所有解。

### 5.6 数据初始化器

**SudokuDataInitializer** 实现了CommandLineRunner接口，在Spring应用启动完成后执行赛季初始化逻辑。构造函数注入SeasonService依赖，确保服务Bean已完全初始化。

`run()` 方法直接调用seasonService的initializeSeasonIfNeeded方法。如果数据库中不存在赛季记录，该方法会触发第一个赛季的创建。

---

## 6. API接口文档

### 6.1 会话管理接口

**POST /api/session** 创建新用户会话

响应体包含新建的会话ID。该接口同时设置Cookie，便于后续请求自动携带会话信息。

### 6.2 题目相关接口

**GET /api/puzzles/{difficulty}** 获取指定难度的所有题目

路径参数difficulty可选值：EASY、MEDIUM、HARD。返回该难度下所有未删除的题目列表，每道题目包含ID、题目字符串和答案。

**GET /api/puzzle/random/{difficulty}** 获取随机题目

从指定难度的题目池中随机选取一道返回。适用于游戏开始时快速分配题目。

**GET /api/puzzle/{id}** 获取指定ID的题目

根据题目ID精确查询，返回题目详情。如果题目不存在或已删除，返回404状态码。

### 6.3 游戏操作接口

**POST /api/game/start** 开始游戏

请求参数：sessionId（会话ID）、puzzleId（题目ID）。返回用户记录对象，包含尝试次数等信息。如果用户首次尝试该题目，创建新记录；否则累加尝试次数。

**POST /api/game/complete** 完成游戏

请求参数：sessionId、puzzleId、completionTime（完成时间，单位秒）。更新用户记录，标记完成状态，判断并记录最佳成绩。

**GET /api/records/{sessionId}** 获取用户所有记录

返回指定会话ID对应的完整游戏记录列表，包含已完成的和进行中的记录。每条记录关联其对应的题目信息。

**GET /api/records/{sessionId}/completed** 获取已完成记录

仅返回isCompleted为true的记录，用于筛选功能。

**GET /api/record/{sessionId}/{puzzleId}** 获取指定记录

查询用户在特定题目上的游戏记录。如果不存在，返回404。

### 6.4 验证接口

**POST /api/validate** 验证完整答案

请求参数：userSolution（用户答案）、correctSolution（正确答案）。返回{valid: boolean}。前端在用户提交答案时调用此接口判断是否正确。

**POST /api/validate/partial** 验证部分答案

请求参数：currentBoard（当前棋盘状态）、originalPuzzle（原始题目）。检查用户输入是否覆盖了题目提示数字，以及当前棋盘是否满足数独规则。

### 6.5 赛季管理接口

**GET /api/season/current** 获取当前赛季

返回当前最新赛季的配置信息，包括赛季编号、创建时间、下次自动更新时间等。

**GET /api/season/all** 获取所有赛季

返回按赛季编号降序排列的所有历史赛季配置列表。

**POST /api/season/regenerate** 手动触发赛季生成

管理员操作接口。删除所有旧题目并生成全新的150道题目，创建新赛季记录。返回新赛季的配置信息。

---

## 7. 数据库设计

### 7.1 数据表概述

系统使用H2嵌入式数据库，采用JPA自动建表模式。三张核心数据表分别存储数独题目、用户游戏记录和赛季配置信息。表之间通过外键关联，形成完整的数据模型。

### 7.2 SudokuPuzzle表

```sql
CREATE TABLE sudoku_puzzles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    puzzle VARCHAR(81) NOT NULL,
    solution VARCHAR(81) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    difficulty_level INT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    season_number INT DEFAULT 1
);
```

puzzle和solution字段采用81位字符串格式，依次存储9行81列的单元格数值。difficulty字段存储枚举值字符串。is_deleted字段实现逻辑删除，查询时默认过滤已删除记录。season_number标识题目所属赛季。

### 7.3 UserRecord表

```sql
CREATE TABLE user_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    puzzle_id BIGINT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    completion_time INT NOT NULL,
    is_completed BOOLEAN NOT NULL,
    is_best_time BOOLEAN NOT NULL,
    attempt_count INT NOT NULL,
    best_time INT,
    season_number INT,
    FOREIGN KEY (puzzle_id) REFERENCES sudoku_puzzles(id)
);
```

puzzle_id外键关联到SudokuPuzzle表。session_id存储用户会话UUID。attempt_count记录尝试次数。best_time存储历史最佳成绩。season_number冗余存储赛季编号，便于按赛季查询记录。

### 7.4 SeasonConfig表

```sql
CREATE TABLE season_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    season_number INT NOT NULL,
    initialized_at TIMESTAMP NOT NULL,
    next_auto_regen_at TIMESTAMP NOT NULL,
    manual_regen_triggered BOOLEAN NOT NULL
);
```

initialized_at记录赛季创建时间。next_auto_regen_at存储下次计划自动更新的时间。manual_regen_triggered区分手动触发和自动触发的更新，避免重复执行。

---

## 8. 前端页面说明

### 8.1 首页（难度选择）

**index.html** 是应用的入口页面，提供难度选择和账号管理功能。页面顶部显示当前赛季信息，包含赛季编号和开始日期。三个难度按钮分别导向关卡选择页面，传递相应的难度参数。

页面底部提供查看记录和账号信息按钮。账号信息弹窗展示用户的会话ID，支持复制和导入功能。重新生成题目按钮提供管理员操作入口。

会话ID采用Cookie和LocalStorage双重存储机制。Cookie确保API请求自动携带会话标识，LocalStorage作为备用存储防止会话丢失。

### 8.2 关卡选择页面

**puzzle-select.html** 以网格形式展示指定难度下的所有50道题目。每个关卡按钮显示编号，已完成的题目右上角显示奖杯图标。页面并行加载题目列表和已完成记录，全部加载完成后统一渲染，避免界面闪烁。

点击关卡按钮跳转到游戏页面，同时传递难度、题目ID和关卡编号参数。题目ID用于API请求，关卡编号仅用于界面显示。

### 8.3 游戏页面

**game.html** 是核心的游戏交互页面，包含计时器、棋盘、数字键盘和控制按钮四大区域。页面加载时首先获取会话ID和题目信息，然后初始化棋盘和计时器。

棋盘采用CSS Grid布局实现9×9网格。每行第三个单元格添加顶部粗边框，每个第三列单元格添加左侧粗边框，形成3×3宫格的分隔效果。固定数字显示为灰色，用户输入显示为蓝色。

数字键盘提供1-9数字按钮和清除按钮。点击数字后再点击棋盘单元格填入数字，或直接点击单元格自动填入上次选择的数字。键盘事件监听支持物理键盘输入。

选中单元格时，页面高亮同行、同列、同宫格的单元格，以及所有相同数字的单元格。冲突单元格以红色边框和背景标记，提示用户存在规则违反。

计时器以MM:SS格式显示，页面可见时自动计时。检查答案接口验证成功后停止计时，弹出胜利弹窗显示完成时间。接口返回isBestTime标志判断是否刷新最佳成绩。

### 8.4 记录页面

**records.html** 展示用户的游戏统计数据和历史记录列表。页面顶部三张统计卡片分别显示已完成题目数、总尝试次数和全局最佳成绩。数据在页面加载时从API获取并实时计算。

筛选按钮支持按难度过滤记录列表。表格显示每条记录的详细信息，包括赛季编号、题目ID、难度、状态、尝试次数、完成时间和最佳成绩。进行中的记录完成时间显示为"--:--"。

---

## 9. 依赖关系

### 9.1 Spring Boot Starter依赖

**spring-boot-starter-web** 提供了Spring MVC、内嵌Tomcat、JSON处理等Web开发所需的核心组件。是构建RESTful API的基础依赖。

**spring-boot-starter-data-jpa** 集成了Spring Data JPA和Hibernate ORM。自动配置数据源、EntityManagerFactory和事务管理器，大幅简化持久层开发工作量。

**spring-boot-starter-thymeleaf** 提供Thymeleaf模板引擎的集成支持。配置Thymeleaf视图解析器，支持HTML模板的热重载（开发模式）。

**spring-boot-starter-validation** 集成Hibernate Validator，实现请求参数的数据校验功能。虽然当前项目未显式使用，但为未来的参数验证需求预留了能力。

### 9.2 数据库依赖

**h2** 是H2嵌入式数据库的JDBC驱动。runtime scope表明其仅在运行时需要，编译时不参与。H2支持纯内存模式、文件模式和服务器模式，本项目采用文件模式。

### 9.3 工具依赖

**lombok** 通过注解处理器在编译期自动生成Getter、Setter、构造函数等样板代码。使用@Data、@NoArgsConstructor、@AllArgsConstructor注解大幅精简实体类代码量。

### 9.4 测试依赖

**spring-boot-starter-test** 包含JUnit、Mockito、Spring Test等测试框架的依赖。提供@SpringBootTest注解支持集成测试，@MockBean注解支持单元测试。

### 9.5 依赖传递关系

Maven自动解析依赖的传递关系。spring-boot-starter-data-jpa会引入spring-boot-starter和hibernate-core。spring-boot-starter引入spring-context、spring-beans等核心模块。这种传递机制减少了显式声明的工作量。

---

## 10. 项目运行方式

### 10.1 环境要求

**Java 17** 或更高版本。Spring Boot 3.x要求最低Java 17支持，项目配置的java.version属性明确指定了这一要求。建议使用LTS版本的JDK以确保稳定性和安全更新。

**Maven 3.6** 或更高版本。Maven负责项目构建、依赖下载和打包操作。本地仓库（Maven Repository）首次运行时会下载所有依赖，建议配置国内镜像源加速下载。

### 10.2 开发环境运行

在项目根目录执行以下命令启动应用：

```bash
mvn spring-boot:run
```

Maven会自动下载依赖、编译项目，然后启动Spring Boot应用。启动日志中可以看到嵌入式Tomcat的初始化信息，默认监听8081端口。H2数据库文件会在data目录下自动创建。

开发模式下Thymeleaf模板缓存是禁用的，修改HTML文件后刷新浏览器即可看到效果，无需重启应用。

### 10.3 打包运行

执行以下命令构建可执行的JAR包：

```bash
mvn clean package
```

构建完成后，JAR文件生成在target目录下，文件名为sudoku-game-1.0.0.jar。使用以下命令运行：

```bash
java -jar target/sudoku-game-1.0.0.jar
```

JAR包包含所有依赖和嵌入式的Tomcat服务器，可以直接部署到任意安装了Java运行时的服务器上。

### 10.4 H2数据库控制台

应用运行期间，可以通过浏览器访问H2数据库控制台进行数据查询和调试。访问地址为`http://localhost:8081/h2-console`，连接配置如下：

- JDBC URL：jdbc:h2:file:./data/sudokudb
- 用户名：sa
- 密码：password

控制台功能包括执行SQL查询、查看表结构和数据预览。注意不要在生产环境中开放H2控制台访问。

### 10.5 配置说明

主要配置项位于src/main/resources/application.properties文件：

**server.port=8081** 指定Tomcat监听端口。如需更改端口或部署多个实例，修改此配置。

**spring.datasource.url** 定义H2数据库连接URL。file:./data/sudokudb表示数据库文件存储在data目录下。

**spring.jpa.hibernate.ddl-auto=update** 配置Hibernate的DDL策略。update模式根据实体类自动创建或更新表结构，适合开发阶段。

**spring.jpa.show-sql=true** 启用SQL语句日志输出，便于调试和性能分析。生产环境建议关闭。

---

## 附录：关键算法说明

### A.1 数独生成算法

数独生成采用回溯法填充完整终盘，然后通过挖空法生成谜题。填充时使用洗牌后的数字序列保证随机性，挖空时验证唯一解保证题目质量。

### A.2 唯一解验证算法

使用剪枝优化的回溯算法统计解的数量。当解的数量超过1时立即停止，避免不必要的搜索。对于标准数独问题，这种剪枝策略能大幅提升验证效率。

### A.3 难度控制参数

简单难度设置35个空格，生成相对宽松的谜题。中等难度设置45个空格，需要一定的逻辑推理。高级难度设置55个空格，要求较强的候选数排除和区块分析能力。

---

*本文档最后更新于2026年5月*
