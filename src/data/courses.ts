import { Course, CourseCategory } from '../types';

export const CATEGORIES: CourseCategory[] = [
  'All',
  'Programming',
  'AI and ML',
  'Web Development',
  'Database',
  'Computer Science',
];

export const SAMPLE_COURSES: Course[] = [
  {
    id: 'java-fundamentals',
    title: 'Java Fundamentals',
    description: 'Master object-oriented programming principles, syntax, data types, and core standard libraries in Java.',
    shortDescription: 'Master object-oriented programming principles, syntax, data types, and core standard libraries in Java.',
    fullDescription: 'Java Fundamentals provides students and capacity builders with a rigorous foundation in Object-Oriented Programming (OOP). You will explore essential concepts including classes, inheritance, encapsulation, polymorphism, exception handling, and Java Collections. Hands-on coding exercises prepare learners for building robust enterprise software and enterprise-grade backend systems.',
    category: 'Programming',
    duration: '20 hours',
    durationHours: 20,
    trainerId: 'foundation-trainer-1',
    trainerName: 'Dr. Rajesh Sharma (Faculty Advisor, Computer Science)',
    level: 'Beginner',
    status: 'published',
    prerequisites: 'Basic familiarity with computer operations and elementary logic.',
    syllabus: [
      'Module 1: Introduction to Java Virtual Machine (JVM) & Basic Syntax',
      'Module 2: Control Flow Statements & Method Construction',
      'Module 3: Object-Oriented Paradigms: Classes, Objects & Encapsulation',
      'Module 4: Inheritance, Polymorphism & Abstract Interfaces',
      'Module 5: Exception Handling & Collections Framework'
    ],
    outcomes: [
      'Write clean, modular, and error-resilient Java programs',
      'Apply standard OOP design principles to real-world software modules',
      'Prepare for Java software engineering interviews and certifications'
    ]
  },
  {
    id: 'python-for-beginners',
    title: 'Python for Beginners',
    description: 'Learn Python programming from scratch with clean syntax, modular functions, file handling, and scripts.',
    shortDescription: 'Learn Python programming from scratch with clean syntax, modular functions, file handling, and scripts.',
    fullDescription: 'Python for Beginners is engineered for first-time coders, engineering students, and professionals looking to automate tasks and build foundational computing skills. This course guides you through core syntax, built-in data structures (lists, dictionaries, sets), functional programming, and practical script development for real-world problem solving.',
    category: 'Programming',
    duration: '15 hours',
    durationHours: 15,
    trainerId: 'foundation-trainer-2',
    trainerName: 'Prof. Anita Desai (Software Systems Lead)',
    level: 'Beginner',
    status: 'published',
    prerequisites: 'No prior programming knowledge required.',
    syllabus: [
      'Module 1: Python Environment Setup & Variable Mechanics',
      'Module 2: Data Structures: Lists, Tuples, Dictionaries & Sets',
      'Module 3: Writing Reusable Functions & Modular Architecture',
      'Module 4: File I/O Operations & Error Handling',
      'Module 5: Building Automation Scripts & Standard Library Tools'
    ],
    outcomes: [
      'Gain fluency in Python idioms and core syntax',
      'Automate repetitive computer tasks with concise Python scripts',
      'Build confidence to progress into Data Science and Web Development'
    ]
  },
  {
    id: 'intro-to-machine-learning',
    title: 'Introduction to Machine Learning',
    description: 'Explore supervised and unsupervised algorithms, model evaluation metrics, and practical machine learning pipelines.',
    shortDescription: 'Explore supervised and unsupervised algorithms, model evaluation metrics, and practical machine learning pipelines.',
    fullDescription: 'Introduction to Machine Learning demystifies modern artificial intelligence concepts. Designed to foster institutional capacity in applied AI, this course introduces supervised regression, classification algorithms (Decision Trees, Random Forests, Logistic Regression), and unsupervised clustering techniques. You will learn to clean datasets, train models, and measure predictive performance accurately.',
    category: 'AI and ML',
    duration: '25 hours',
    durationHours: 25,
    trainerId: 'foundation-trainer-3',
    trainerName: 'Dr. K. Venkatraman (Data Science & AI Lab)',
    level: 'Intermediate',
    status: 'published',
    prerequisites: 'Introductory Python knowledge and basic high school linear algebra.',
    syllabus: [
      'Module 1: The AI/ML Landscape & Scientific Computing Basics',
      'Module 2: Feature Engineering & Data Preprocessing Pipelines',
      'Module 3: Supervised Learning: Regression & Classification Algorithms',
      'Module 4: Unsupervised Learning: Clustering & Dimensionality Reduction',
      'Module 5: Model Validation, Confusion Matrices & Overfitting Prevention'
    ],
    outcomes: [
      'Understand the mathematical and intuitive foundations of ML algorithms',
      'Clean, normalize, and split data for robust scientific modeling',
      'Evaluate model reliability using industry-standard precision-recall metrics'
    ]
  },
  {
    id: 'web-development-basics',
    title: 'Web Development Basics',
    description: 'Build modern responsive websites using semantic HTML5, modern CSS styling, flexbox/grid, and JavaScript.',
    shortDescription: 'Build modern responsive websites using semantic HTML5, modern CSS styling, flexbox/grid, and JavaScript.',
    fullDescription: 'Web Development Basics equips learners with fundamental skills to architect modern, mobile-responsive web pages. Beginning with semantic markup and accessible HTML structures, the course covers modern CSS layout techniques including Flexbox, CSS Grid, and responsive media queries, concluding with interactive DOM manipulation using vanilla JavaScript.',
    category: 'Web Development',
    duration: '18 hours',
    durationHours: 18,
    trainerId: 'foundation-trainer-4',
    trainerName: 'Meera Nair (Full Stack Software Architect)',
    level: 'Beginner',
    status: 'published',
    prerequisites: 'Comfortable with basic web browser navigation and text editors.',
    syllabus: [
      'Module 1: Semantic HTML5 Architecture & Document Structuring',
      'Module 2: Modern CSS Layouts: Flexbox, CSS Grid & Responsive Units',
      'Module 3: Typography, Color Theory & Mobile-First Design Principles',
      'Module 4: JavaScript Fundamentals: Variables, Events & DOM Manipulation',
      'Module 5: Interactive Web Components & Project Deployment Fundamentals'
    ],
    outcomes: [
      'Create fully responsive, mobile-optimized websites from scratch',
      'Write accessible HTML and clean CSS without relying on heavy frameworks',
      'Implement interactive UI components using standard JavaScript events'
    ]
  },
  {
    id: 'sql-database-fundamentals',
    title: 'SQL and Database Fundamentals',
    description: 'Design relational schemas, write queries, manage joins, and optimize indexes for reliable databases.',
    shortDescription: 'Design relational schemas, write queries, manage joins, and optimize indexes for reliable databases.',
    fullDescription: 'SQL and Database Fundamentals delivers essential database literacy for aspiring engineers and digital managers. Learn how relational databases organize information, how to formulate complex SELECT queries using multi-table JOINs, GROUP BY aggregations, and subqueries, and how normalization principles guarantee data integrity across digital portals.',
    category: 'Database',
    duration: '12 hours',
    durationHours: 12,
    trainerId: 'foundation-trainer-5',
    trainerName: 'Vikram Goel (Lead Database Administrator)',
    level: 'Beginner',
    status: 'published',
    prerequisites: 'Basic computer literacy. No database experience required.',
    syllabus: [
      'Module 1: Relational Database Architecture & Entity Relationship Models',
      'Module 2: DDL vs DML: Tables, Data Types & Primary/Foreign Keys',
      'Module 3: Querying Data: SELECT, WHERE, ORDER BY & Filtering',
      'Module 4: Advanced SQL: INNER/LEFT JOINs, Subqueries & Aggregations',
      'Module 5: Schema Normalization & Indexing Essentials'
    ],
    outcomes: [
      'Confidently write multi-table SQL queries to extract business insights',
      'Design normalized database schemas following 1NF, 2NF, and 3NF rules',
      'Understand query performance fundamentals and transaction integrity'
    ]
  },
  {
    id: 'data-structures-and-algorithms',
    title: 'Data Structures and Algorithms',
    description: 'Master asymptotic time-space analysis, linear and non-linear data structures, trees, graphs, and sorting.',
    shortDescription: 'Master asymptotic time-space analysis, linear and non-linear data structures, trees, graphs, and sorting.',
    fullDescription: 'Data Structures and Algorithms (DSA) is the cornerstone of computer science and technical capacity building. Learners will study asymptotic Big-O notation, arrays, linked lists, stacks, queues, binary search trees, hashing techniques, recursion, and graph traversal algorithms (BFS/DFS). This course emphasizes problem-solving efficiency and algorithmic rigor.',
    category: 'Computer Science',
    duration: '30 hours',
    durationHours: 30,
    trainerId: 'foundation-trainer-6',
    trainerName: 'Prof. S. Sen (Algorithms Research Group)',
    level: 'Intermediate',
    status: 'published',
    prerequisites: 'Proficiency in at least one programming language (Java, C++, or Python).',
    syllabus: [
      'Module 1: Asymptotic Complexity & Big-O Notation Mastery',
      'Module 2: Linear Structures: Arrays, Linked Lists, Stacks & Queues',
      'Module 3: Recursion, Divide & Conquer, Sorting & Searching Algorithms',
      'Module 4: Non-Linear Structures: Binary Trees & Binary Search Trees',
      'Module 5: Hashing Techniques & Graph Traversal (BFS / DFS)'
    ],
    outcomes: [
      'Analyze time and space complexity with theoretical precision',
      'Select optimal data structures for diverse computational constraints',
      'Solve complex algorithmic problems required for high-stakes technical roles'
    ]
  }
];
