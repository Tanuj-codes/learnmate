import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { addDaysToKey, dateKeyToDbDate, todayKey } from '../src/utils/dates.js';
import { evaluateAchievements } from '../src/services/achievementService.js';

const prisma = new PrismaClient();

const COURSES = [
  {
    slug: 'web-development-foundations',
    title: 'Web Development Foundations',
    tagline: 'Build your first real pages with HTML, CSS, and JavaScript.',
    description:
      'A practical introduction to how the web works. You will structure content with HTML, style responsive layouts with CSS, and add behaviour with JavaScript. Each lesson ends with a checkpoint quiz and a flashcard deck for revision.',
    category: 'Web Development',
    difficulty: 'BEGINNER',
    estimatedMinutes: 150,
    topics: [
      {
        title: 'How the web works',
        lessons: [
          {
            title: 'The request and response cycle',
            summary: 'Follow a URL from the browser to the server and back.',
            minutes: 12,
            content: `## Why this matters
Every web page you use is the result of a conversation between a browser and a server. Understanding that conversation makes debugging far less mysterious.

## The journey of a request
When you type a URL, the browser resolves the domain to an IP address, opens a connection, and sends an HTTP request.

- A request includes a method, a path, and headers.
- GET requests ask for a resource. POST requests send data.
- The server replies with a status code and a body.
- 2xx means success, 3xx means redirect, 4xx is a client problem, and 5xx is a server problem.

## A useful habit
Open the browser developer tools Network tab and watch the requests a page makes. You will quickly spot slow calls, failed images, and unexpected redirects.

## Key takeaway
The browser asks, the server answers, and the browser renders. Everything else is detail layered on top of that loop.`,
          },
          {
            title: 'DNS, hosting, and HTTPS',
            summary: 'Understand how names become addresses and why HTTPS matters.',
            minutes: 10,
            content: `## From name to address
Computers find each other with IP addresses, but people remember names. DNS is the directory that translates a domain like example.com into an address.

- A records point a domain at an IPv4 address.
- CNAME records alias one name to another.
- TTL controls how long a DNS answer may be cached.

## Hosting
A host is simply a computer that serves your files or runs your API. Static sites can be served from a CDN close to the visitor. Dynamic apps need a runtime and often a database.

## HTTPS
HTTPS encrypts traffic in transit using TLS. It protects passwords, cookies, and personal data from being read or altered by anyone on the network.

## Key takeaway
Use HTTPS everywhere, even locally when testing cookies, and remember that a DNS change can take time to propagate.`,
          },
        ],
      },
      {
        title: 'Structure and style',
        lessons: [
          {
            title: 'Semantic HTML that scales',
            summary: 'Choose elements for meaning, not just appearance.',
            minutes: 14,
            content: `## Semantics are a contract
Semantic HTML tells browsers, screen readers, and search engines what each part of the page means. A div is a last resort, not a default.

- Use header, nav, main, section, and footer for page landmarks.
- Use h1 through h6 in order, without skipping levels.
- Use button for actions and a for navigation.
- Label every form control with a real label element.

## Accessibility starts in markup
A semantic button is focusable and responds to Enter and Space automatically. A clickable div is not. Choosing the right element removes work and prevents bugs.

## A quick audit
Turn off CSS in the browser. If the page still reads in a sensible order, your structure is probably sound.

## Key takeaway
Write markup that makes sense without styling. CSS can change appearance, but it cannot replace meaning.`,
          },
          {
            title: 'CSS layout with flexbox and grid',
            summary: 'Build reliable layouts for small and large screens.',
            minutes: 16,
            content: `## Two tools, two jobs
Flexbox is ideal for arranging items along one axis. Grid is ideal for aligning content in rows and columns at the same time.

- Use flexbox for navigation bars, button groups, and card internals.
- Use grid for page sections, dashboards, and galleries.
- Use gap instead of margin hacks between items.
- Let content size determine breakpoints where you can.

## Responsive by default
Start with a single-column layout. Add columns only when there is room. Always test at 320 pixels wide, not just at desktop size.

## Avoid fighting the layout
If you find yourself adding negative margins, step back. Usually a missing wrapper or the wrong display mode is the real problem.

## Key takeaway
Choose the layout tool that matches the shape of the content, then add breakpoints only where the design genuinely needs them.`,
          },
        ],
      },
      {
        title: 'JavaScript foundations',
        lessons: [
          {
            title: 'Variables, functions, and scope',
            summary: 'Learn the core building blocks of JavaScript.',
            minutes: 15,
            content: `## Declaring values
Use const by default and let only when a value must change. Avoid var in modern code because its function scope causes surprising bugs.

- const prevents reassignment, not mutation of objects.
- Arrow functions inherit this from their surrounding scope.
- Block scope keeps variables close to where they are used.
- Pure functions return a value and avoid side effects.

## Small functions win
A function that does one thing is easier to test and reuse. Name it after the outcome, such as calculateProgress rather than handleClick.

## Reading errors
Read the first line of a stack trace and the exact error message. A TypeError about reading a property of undefined usually means data arrived later than expected.

## Key takeaway
Prefer small pure functions and explicit data flow. Most JavaScript confusion comes from hidden mutation and scope.`,
          },
          {
            title: 'Async JavaScript and APIs',
            summary: 'Fetch data without blocking the interface.',
            minutes: 18,
            content: `## JavaScript runs on one thread
Long synchronous work blocks rendering and input. Async patterns let the browser keep responding while work is in progress.

- A Promise represents a future value.
- async functions always return a Promise.
- await pauses only the current async function.
- Always handle rejected promises, including network errors.

## A resilient fetch
Check response.ok before parsing JSON, set a timeout where possible, and show a useful message when the request fails. Never swallow errors silently.

## Loading states matter
Users need to know whether the app is waiting, empty, or broken. Good interfaces distinguish those states clearly.

## Key takeaway
Treat every network call as something that can fail. Design the waiting and failure states at the same time as the success state.`,
          },
        ],
      },
    ],
    flashcards: [
      { topic: 'How the web works', front: 'HTTP status 404', back: 'The requested resource was not found on the server.' },
      { topic: 'How the web works', front: 'DNS', back: 'The system that translates domain names into IP addresses.' },
      { topic: 'How the web works', front: 'HTTPS', back: 'HTTP encrypted with TLS so traffic cannot be read or altered in transit.' },
      { topic: 'Structure and style', front: 'Semantic HTML', back: 'Markup that describes meaning and structure rather than only appearance.' },
      { topic: 'Structure and style', front: 'Flexbox', back: 'A one-dimensional CSS layout model for arranging items along a row or column.' },
      { topic: 'Structure and style', front: 'CSS Grid', back: 'A two-dimensional layout system for aligning content in rows and columns.' },
      { topic: 'JavaScript', front: 'const', back: 'A block-scoped binding that cannot be reassigned after initialisation.' },
      { topic: 'JavaScript', front: 'await', back: 'Pauses the current async function until a Promise settles.' },
    ],
    quiz: {
      title: 'Web Foundations Checkpoint',
      description: 'Check your understanding of requests, semantic markup, and JavaScript fundamentals.',
      difficulty: 'BEGINNER',
      passingScore: 60,
      questions: [
        {
          topic: 'How the web works',
          prompt: 'Which HTTP status code range indicates a client-side error?',
          options: ['1xx', '2xx', '4xx', '5xx'],
          correctIndex: 2,
          explanation: '4xx responses mean the request itself was invalid or not permitted, such as 404 Not Found or 401 Unauthorized.',
        },
        {
          topic: 'How the web works',
          prompt: 'What is the main purpose of DNS?',
          options: [
            'Encrypting traffic between browser and server',
            'Mapping domain names to IP addresses',
            'Compressing images before download',
            'Caching JavaScript files',
          ],
          correctIndex: 1,
          explanation: 'DNS is the directory that resolves human-friendly domain names into machine-routable IP addresses.',
        },
        {
          topic: 'Structure and style',
          prompt: 'Which element should be used for an action that runs JavaScript on the page?',
          options: ['a', 'button', 'div', 'span'],
          correctIndex: 1,
          explanation: 'A button is focusable, keyboard-operable, and semantically an action. A div is not interactive by default.',
        },
        {
          topic: 'Structure and style',
          prompt: 'Which CSS layout tool is designed for two-dimensional layouts?',
          options: ['Flexbox', 'CSS Grid', 'Float', 'Position absolute'],
          correctIndex: 1,
          explanation: 'Grid controls rows and columns at the same time, while Flexbox is primarily one-dimensional.',
        },
        {
          topic: 'JavaScript',
          prompt: 'What does the await keyword do inside an async function?',
          options: [
            'Blocks the entire browser thread',
            'Pauses the async function until a Promise settles',
            'Cancels the Promise',
            'Converts a Promise into a callback',
          ],
          correctIndex: 1,
          explanation: 'await suspends only the async function. Other browser work, including rendering and input, can continue.',
        },
        {
          topic: 'JavaScript',
          prompt: 'Which binding cannot be reassigned after initialisation?',
          options: ['let', 'var', 'const', 'function'],
          correctIndex: 2,
          explanation: 'const creates a block-scoped binding that cannot be reassigned. Object contents can still be mutated.',
        },
        {
          topic: 'How the web works',
          prompt: 'What should you check immediately after fetch resolves before parsing JSON?',
          options: ['response.statusText only', 'response.ok', 'response.headers only', 'navigator.onLine'],
          correctIndex: 1,
          explanation: 'response.ok is true for 2xx statuses. Checking it prevents parsing error pages as if they were data.',
        },
        {
          topic: 'Structure and style',
          prompt: 'Why should headings be used in order without skipping levels?',
          options: [
            'It makes the page load faster',
            'It preserves a meaningful document outline for assistive technology',
            'It prevents CSS from breaking',
            'It is required for HTTPS',
          ],
          correctIndex: 1,
          explanation: 'Screen readers and other tools use heading levels to build an outline of the page. Skipping levels makes navigation confusing.',
        },
      ],
    },
  },
  {
    slug: 'data-structures-essentials',
    title: 'Data Structures Essentials',
    tagline: 'Choose the right structure and reason about performance.',
    description:
      'Learn how arrays, hash maps, stacks, queues, trees, and graphs behave, and how to evaluate their costs. This course focuses on practical reasoning rather than memorising code.',
    category: 'Computer Science',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 180,
    topics: [
      {
        title: 'Sequences and complexity',
        lessons: [
          {
            title: 'Big-O without the fear',
            summary: 'Describe growth rates with a few simple rules.',
            minutes: 14,
            content: `## What Big-O actually describes
Big-O describes how work grows as input size grows. It intentionally ignores constant factors and small inputs.

- O(1) means constant work regardless of size.
- O(log n) halves the problem each step, like binary search.
- O(n) touches each item once.
- O(n log n) appears in efficient sorting.
- O(n^2) appears in nested loops over the same input.

## Reading code for complexity
Count nested loops over the input. A loop that cuts the range in half is logarithmic. A lookup in a hash map is expected O(1).

## Why constants still matter
Big-O is a planning tool, not a benchmark. For small data, a simpler algorithm with worse asymptotics can be faster.

## Key takeaway
Use Big-O to rule out structures that cannot scale, then measure real performance when it matters.`,
          },
          {
            title: 'Arrays and dynamic arrays',
            summary: 'Understand indexing, resizing, and the cost of insertion.',
            minutes: 13,
            content: `## Contiguous memory
An array stores elements next to each other, which makes index access O(1). The trade-off is that inserting or removing in the middle requires shifting elements.

- Access by index: O(1).
- Search by value: O(n).
- Append at the end: amortised O(1).
- Insert at the beginning: O(n).

## Dynamic arrays
Languages grow arrays by allocating a larger block and copying elements. Doubling capacity keeps the average append cost constant, even though occasional resizes are expensive.

## When to use one
Arrays are excellent when order matters and you mostly read or append. If you need frequent lookups by key, a hash map is usually better.

## Key takeaway
Array performance is excellent for indexed reads and appends, and poor for middle insertions.`,
          },
        ],
      },
      {
        title: 'Linear structures',
        lessons: [
          {
            title: 'Stacks and queues',
            summary: 'Master two structures that control the order of work.',
            minutes: 12,
            content: `## LIFO and FIFO
A stack is last in, first out. A queue is first in, first out. Both support constant-time insertion and removal at their active end.

- Undo history is a stack.
- Function calls use a call stack.
- Print jobs and message queues are queues.
- Breadth-first search uses a queue.
- Depth-first search uses a stack or recursion.

## Implementations
A dynamic array works well as a stack. For a queue, avoid shifting an array on every dequeue; use a linked list or a circular buffer.

## Common mistake
Using the wrong end of an array for queue operations turns an O(1) operation into O(n). Check the implementation, not just the name.

## Key takeaway
Pick the structure whose removal order matches your problem, and make sure the implementation keeps both ends cheap.`,
          },
          {
            title: 'Hash maps in practice',
            summary: 'Get average constant-time lookups and know their limits.',
            minutes: 15,
            content: `## How hashing works
A hash function converts a key into a bucket index. A good function spreads keys evenly so buckets stay short.

- Average lookup, insert, and delete: O(1).
- Worst case: O(n) if many keys collide.
- Keys must be stable and consistent with equality.
- Iteration order is not usually guaranteed.

## Collision handling
Separate chaining stores a small list per bucket. Open addressing probes for another slot. Both are fine when load factors are controlled.

## Practical advice
Hash maps are ideal for counting, caching, and deduplicating. Do not rely on object property order in JavaScript when correctness depends on it.

## Key takeaway
Hash maps trade memory for speed. They are the default answer for key-based lookup unless you need ordering.`,
          },
        ],
      },
      {
        title: 'Trees and graphs',
        lessons: [
          {
            title: 'Binary search trees',
            summary: 'Use ordering to speed up search, insert, and delete.',
            minutes: 16,
            content: `## The ordering rule
In a binary search tree, every value in the left subtree is smaller than the node, and every value in the right subtree is larger.

- Search, insert, and delete are O(h), where h is height.
- A balanced tree has height O(log n).
- A badly ordered insertion sequence can create a linked list of height O(n).

## Traversals
In-order traversal visits values in sorted order. Pre-order and post-order are useful for copying and deleting trees.

## Balanced variants
AVL trees and red-black trees rebalance after updates to keep height logarithmic. Most standard libraries provide a balanced ordered map.

## Key takeaway
Binary search trees are powerful only when balanced. Otherwise their performance degrades to that of a linked list.`,
          },
          {
            title: 'Graph traversal and shortest paths',
            summary: 'Explore networks with BFS, DFS, and Dijkstra.',
            minutes: 18,
            content: `## Representing a graph
An adjacency list stores neighbours per node and is memory-efficient for sparse graphs. An adjacency matrix is simple but costs O(V^2) space.

## Choosing a traversal
Breadth-first search finds the fewest edges from a source in an unweighted graph. Depth-first search is useful for connectivity, cycles, and topological sorting.

- BFS uses a queue and a visited set.
- DFS uses a stack or recursion.
- Always track visited nodes to avoid infinite loops.
- Dijkstra finds shortest paths with non-negative edge weights.
- Bellman-Ford handles negative edges and detects negative cycles.

## Complexity
BFS and DFS are O(V + E). Dijkstra with a binary heap is O((V + E) log V).

## Key takeaway
Model the problem as nodes and edges first, then choose a traversal that matches whether edge weights matter.`,
          },
        ],
      },
    ],
    flashcards: [
      { topic: 'Complexity', front: 'Amortised O(1)', back: 'The average cost per operation over a sequence, even if some operations are expensive.' },
      { topic: 'Complexity', front: 'O(log n)', back: 'Work grows logarithmically because each step halves the remaining input.' },
      { topic: 'Linear structures', front: 'Stack', back: 'A last-in, first-out structure with constant-time push and pop.' },
      { topic: 'Linear structures', front: 'Queue', back: 'A first-in, first-out structure used in scheduling and breadth-first search.' },
      { topic: 'Hash maps', front: 'Load factor', back: 'The number of stored entries divided by the number of buckets; high values increase collisions.' },
      { topic: 'Trees', front: 'In-order traversal', back: 'Visits the left subtree, then the node, then the right subtree, producing sorted output in a BST.' },
      { topic: 'Graphs', front: 'BFS', back: 'A queue-based traversal that finds the fewest-edge path in an unweighted graph.' },
      { topic: 'Graphs', front: 'Dijkstra', back: 'A shortest-path algorithm for graphs with non-negative edge weights.' },
    ],
    quiz: {
      title: 'Data Structures Checkpoint',
      description: 'Test your reasoning about complexity, hash maps, trees, and graph traversal.',
      difficulty: 'INTERMEDIATE',
      passingScore: 60,
      questions: [
        {
          topic: 'Complexity',
          prompt: 'What is the average time complexity of inserting a key into a hash map?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          correctIndex: 0,
          explanation: 'With a good hash function and controlled load factor, insertion is expected constant time.',
        },
        {
          topic: 'Complexity',
          prompt: 'Why is appending to a dynamic array amortised O(1)?',
          options: [
            'Because arrays are always sorted',
            'Because capacity is doubled and the occasional copy is spread across many appends',
            'Because the CPU caches every append',
            'Because the array never resizes',
          ],
          correctIndex: 1,
          explanation: 'Doubling capacity means copies happen rarely enough that the average cost per append stays constant.',
        },
        {
          topic: 'Linear structures',
          prompt: 'Which structure naturally supports an undo history?',
          options: ['Queue', 'Stack', 'Graph', 'Hash map'],
          correctIndex: 1,
          explanation: 'Undo reverses the most recent action first, which is last-in, first-out behaviour.',
        },
        {
          topic: 'Hash maps',
          prompt: 'What happens to hash map performance when many keys collide?',
          options: [
            'Lookups remain O(1) in the worst case',
            'Lookups can degrade to O(n)',
            'The map automatically sorts its keys',
            'Memory usage becomes constant',
          ],
          correctIndex: 1,
          explanation: 'Heavy collisions turn operations into linear scans of a bucket or probe sequence.',
        },
        {
          topic: 'Trees',
          prompt: 'Which traversal of a binary search tree visits values in sorted order?',
          options: ['Pre-order', 'Post-order', 'In-order', 'Level-order'],
          correctIndex: 2,
          explanation: 'In-order traversal visits left subtree, node, then right subtree, which yields ascending order in a BST.',
        },
        {
          topic: 'Trees',
          prompt: 'Why does an unbalanced binary search tree lose its advantage?',
          options: [
            'Its height can become O(n)',
            'It cannot store duplicates',
            'It requires more memory than a graph',
            'Its keys are no longer comparable',
          ],
          correctIndex: 0,
          explanation: 'Operations are O(height). A degenerate tree behaves like a linked list with O(n) height.',
        },
        {
          topic: 'Graphs',
          prompt: 'Which algorithm finds the fewest-edge path in an unweighted graph?',
          options: ['Dijkstra', 'BFS', 'DFS', 'Bellman-Ford'],
          correctIndex: 1,
          explanation: 'BFS explores in layers, so the first time it reaches a node is via the fewest edges.',
        },
        {
          topic: 'Graphs',
          prompt: 'What is the complexity of BFS on a graph with V vertices and E edges?',
          options: ['O(V)', 'O(E)', 'O(V + E)', 'O(V^2)'],
          correctIndex: 2,
          explanation: 'Each vertex is visited once and each edge is examined a constant number of times, giving O(V + E).',
        },
      ],
    },
  },
  {
    slug: 'applied-machine-learning',
    title: 'Applied Machine Learning',
    tagline: 'Turn data into reliable predictions without fooling yourself.',
    description:
      'A grounded introduction to supervised learning, evaluation, and responsible deployment. Learn the workflow, the failure modes, and the questions to ask before trusting a model.',
    category: 'Data & AI',
    difficulty: 'ADVANCED',
    estimatedMinutes: 210,
    topics: [
      {
        title: 'Learning from data',
        lessons: [
          {
            title: 'Supervised learning workflow',
            summary: 'Frame a problem, prepare data, and train a baseline.',
            minutes: 18,
            content: `## Start with the decision
A model is useful only if it improves a decision. Define the outcome, the action it informs, and how success will be measured before choosing an algorithm.

- Define the prediction target and prediction time.
- Split data into training, validation, and test sets.
- Build a simple baseline first.
- Check for leakage before celebrating accuracy.

## Data quality
Missing values, duplicated rows, and inconsistent labels cause more failures than model choice. Inspect distributions and a sample of raw records.

## The baseline
A baseline can be a majority-class prediction, a simple rule, or a small linear model. It gives you a reference point and catches broken pipelines early.

## Key takeaway
Most machine learning work is problem framing and data preparation. A trustworthy baseline is more valuable than an untested complex model.`,
          },
          {
            title: 'Bias, variance, and regularisation',
            summary: 'Diagnose underfitting and overfitting with the right evidence.',
            minutes: 16,
            content: `## Two kinds of error
Bias is error from an overly simple model. Variance is error from sensitivity to the training sample. Both appear as a gap between training and validation performance.

- High training and validation error: underfitting.
- Low training error, high validation error: overfitting.
- More data usually helps variance.
- Better features usually help bias.
- Regularisation constrains model complexity.

## Regularisation
L2 regularisation shrinks weights smoothly. L1 can drive some weights to zero and perform feature selection. The strength is a hyperparameter chosen on validation data.

## Key takeaway
Diagnose the gap before changing the model. More capacity is not a cure for bad features.`,
          },
        ],
      },
      {
        title: 'Evaluation that holds up',
        lessons: [
          {
            title: 'Metrics that match the goal',
            summary: 'Pick metrics based on the cost of mistakes.',
            minutes: 17,
            content: `## Accuracy is not always enough
With imbalanced classes, a model can be accurate by always predicting the majority class. Choose metrics that reflect real costs.

- Precision: of predicted positives, how many are correct?
- Recall: of actual positives, how many were found?
- F1: harmonic mean of precision and recall.
- ROC AUC: ranking quality across thresholds.
- Precision-recall AUC: better for rare positives.

## Thresholds are decisions
A classifier often outputs a probability. The threshold converts it into an action. Set it with domain stakeholders, not by default.

## Key takeaway
Define what a false positive and a false negative cost before selecting a metric.`,
          },
          {
            title: 'Cross-validation and leakage',
            summary: 'Estimate generalisation without contaminating the test set.',
            minutes: 15,
            content: `## Why hold out data
The test set must represent future, unseen cases. Every decision made by looking at it leaks information and inflates your estimate.

- Use k-fold cross-validation on training data for model selection.
- Keep a final test set untouched until the end.
- Fit preprocessing inside each fold.
- Group related records together when they could leak across splits.
- Use time-based splits for temporal data.

## Common leakage examples
Scaling before splitting, target encoding using the full dataset, and duplicate patients across train and test all produce optimistic scores.

## Key takeaway
If a validation score looks too good, suspect leakage before celebrating.`,
          },
        ],
      },
      {
        title: 'Responsible ML',
        lessons: [
          {
            title: 'Fairness and subgroup evaluation',
            summary: 'Measure performance where it matters, not only overall.',
            minutes: 14,
            content: `## Averages hide harm
A model can perform well overall while failing badly for a subgroup. Always report metrics by relevant groups when data allows.

- Check sample size before interpreting subgroup differences.
- Compare error rates, not only accuracy.
- Document known limitations and intended use.
- Include domain experts in defining harm.

## Fairness is not one metric
Different definitions of fairness can conflict. The right choice depends on context, legal requirements, and the decisions being made.

## Key takeaway
Evaluate the model where it will be used, with the people affected by its decisions.`,
          },
          {
            title: 'Monitoring and safe deployment',
            summary: 'Plan for drift, feedback loops, and rollback.',
            minutes: 15,
            content: `## The world changes
Inputs drift, user behaviour shifts, and labels become stale. A model that was accurate at launch can quietly degrade.

- Monitor input distributions and prediction distributions.
- Track outcome metrics with a delay appropriate to the domain.
- Log model version and feature version with each prediction.
- Define rollback and human-review paths.
- Avoid optimizing a proxy until it harms the real goal.

## Feedback loops
Predictions change the data you collect. A recommender may narrow exposure and never learn about alternatives. Monitor exposure, not only clicks.

## Key takeaway
Deployment is the start of the evaluation, not the end. Build monitoring and a rollback plan before launch.`,
          },
        ],
      },
    ],
    flashcards: [
      { topic: 'Fundamentals', front: 'Supervised learning', back: 'Learning a mapping from labelled inputs to a target output.' },
      { topic: 'Fundamentals', front: 'Overfitting', back: 'Fitting training data so closely that performance on unseen data degrades.' },
      { topic: 'Fundamentals', front: 'L2 regularisation', back: 'A penalty on squared weights that discourages overly large coefficients.' },
      { topic: 'Evaluation', front: 'Recall', back: 'The proportion of actual positives that the model correctly identified.' },
      { topic: 'Evaluation', front: 'Data leakage', back: 'Information from outside the training fold contaminating training or validation.' },
      { topic: 'Evaluation', front: 'Cross-validation', back: 'Repeatedly splitting training data into folds to estimate generalisation.' },
      { topic: 'Responsible ML', front: 'Distribution drift', back: 'A change in input or outcome distributions after a model is deployed.' },
      { topic: 'Responsible ML', front: 'Subgroup evaluation', back: 'Reporting model performance separately for groups that may experience different harms.' },
    ],
    quiz: {
      title: 'Applied ML Checkpoint',
      description: 'Assess your grasp of evaluation, leakage, fairness, and monitoring.',
      difficulty: 'ADVANCED',
      passingScore: 60,
      questions: [
        {
          topic: 'Fundamentals',
          prompt: 'A model has very low training error but high validation error. What is the most likely diagnosis?',
          options: ['Underfitting', 'Overfitting', 'Data leakage in validation', 'The baseline is too strong'],
          correctIndex: 1,
          explanation: 'The gap between low training error and high validation error is the classic signature of overfitting.',
        },
        {
          topic: 'Fundamentals',
          prompt: 'What does L2 regularisation do?',
          options: [
            'Removes all features with zero variance',
            'Penalises large squared weights to reduce model complexity',
            'Guarantees fairness across subgroups',
            'Increases the learning rate',
          ],
          correctIndex: 1,
          explanation: 'L2 adds a penalty proportional to squared weights, shrinking coefficients and reducing variance.',
        },
        {
          topic: 'Evaluation',
          prompt: 'Which metric is most useful when missing a positive case is very costly?',
          options: ['Precision', 'Recall', 'Specificity', 'Training accuracy'],
          correctIndex: 1,
          explanation: 'Recall measures the share of actual positives found. High recall reduces missed positives, usually at the cost of precision.',
        },
        {
          topic: 'Evaluation',
          prompt: 'Which practice causes data leakage?',
          options: [
            'Fitting a scaler on the full dataset before splitting',
            'Using a separate test set',
            'Fitting preprocessing inside each cross-validation fold',
            'Using group-aware splits',
          ],
          correctIndex: 0,
          explanation: 'Fitting transformations on the full dataset exposes validation information during training.',
        },
        {
          topic: 'Evaluation',
          prompt: 'Why should the final test set remain untouched during model selection?',
          options: [
            'To keep it small',
            'To preserve an unbiased estimate of generalisation',
            'Because test data cannot be preprocessed',
            'To improve training speed',
          ],
          correctIndex: 1,
          explanation: 'Repeatedly looking at the test set influences decisions and inflates the reported performance.',
        },
        {
          topic: 'Responsible ML',
          prompt: 'A model performs well overall but poorly for a subgroup. What should you do first?',
          options: [
            'Deploy and monitor',
            'Report subgroup metrics and investigate the cause',
            'Remove the subgroup from evaluation',
            'Increase overall accuracy only',
          ],
          correctIndex: 1,
          explanation: 'Averages can hide harm. Subgroup metrics and investigation are necessary before deployment decisions.',
        },
        {
          topic: 'Responsible ML',
          prompt: 'What is distribution drift?',
          options: [
            'A change in model architecture',
            'A change in input or outcome distributions after deployment',
            'An increase in training data quality',
            'A drop in server latency',
          ],
          correctIndex: 1,
          explanation: 'Drift means the data the model sees no longer matches the data it learned from, which can degrade performance.',
        },
        {
          topic: 'Responsible ML',
          prompt: 'Which item should be logged with each prediction for safe operation?',
          options: [
            'Only the predicted label',
            'Model and feature versions plus relevant inputs',
            'The user\'s password',
            'Nothing, to reduce storage costs',
          ],
          correctIndex: 1,
          explanation: 'Versioned inputs and model versions make incidents reproducible and rollback practical.',
        },
      ],
    },
  },
];

const ACHIEVEMENTS = [
  { code: 'FIRST_LESSON', name: 'First Steps', description: 'Complete your first lesson.', icon: 'Footprints', criteriaType: 'LESSONS_COMPLETED', criteriaValue: 1, xpReward: 25, tier: 'BRONZE', sortOrder: 1 },
  { code: 'LESSON_5', name: 'Building Momentum', description: 'Complete five lessons.', icon: 'BookOpenCheck', criteriaType: 'LESSONS_COMPLETED', criteriaValue: 5, xpReward: 50, tier: 'SILVER', sortOrder: 2 },
  { code: 'FIRST_QUIZ', name: 'Checkpoint Cleared', description: 'Submit your first quiz attempt.', icon: 'ClipboardCheck', criteriaType: 'QUIZ_ATTEMPTS', criteriaValue: 1, xpReward: 25, tier: 'BRONZE', sortOrder: 3 },
  { code: 'PERFECT_QUIZ', name: 'Flawless Recall', description: 'Score 100% on a quiz.', icon: 'Sparkles', criteriaType: 'PERFECT_QUIZZES', criteriaValue: 1, xpReward: 75, tier: 'GOLD', sortOrder: 4 },
  { code: 'QUIZ_5', name: 'Assessment Regular', description: 'Submit five verified quiz attempts.', icon: 'Target', criteriaType: 'QUIZ_ATTEMPTS', criteriaValue: 5, xpReward: 60, tier: 'SILVER', sortOrder: 5 },
  { code: 'STREAK_3', name: 'Three-Day Rhythm', description: 'Meet your daily goal three days in a row.', icon: 'Flame', criteriaType: 'STREAK_DAYS', criteriaValue: 3, xpReward: 40, tier: 'BRONZE', sortOrder: 6 },
  { code: 'STREAK_7', name: 'Weekly Consistency', description: 'Meet your daily goal seven days in a row.', icon: 'CalendarCheck', criteriaType: 'STREAK_DAYS', criteriaValue: 7, xpReward: 100, tier: 'GOLD', sortOrder: 7 },
  { code: 'XP_500', name: 'XP Collector', description: 'Earn 500 total XP.', icon: 'Zap', criteriaType: 'TOTAL_XP', criteriaValue: 500, xpReward: 50, tier: 'SILVER', sortOrder: 8 },
  { code: 'FLASHCARD_25', name: 'Revision Habit', description: 'Review 25 flashcards.', icon: 'Layers', criteriaType: 'FLASHCARD_REVIEWS', criteriaValue: 25, xpReward: 45, tier: 'SILVER', sortOrder: 9 },
  { code: 'GAME_5', name: 'Play to Learn', description: 'Complete five verified mini-games.', icon: 'Gamepad2', criteriaType: 'GAME_SESSIONS', criteriaValue: 5, xpReward: 40, tier: 'BRONZE', sortOrder: 10 },
  { code: 'GOAL_7', name: 'Goal Setter', description: 'Complete seven daily goals.', icon: 'CheckCircle2', criteriaType: 'GOALS_COMPLETED', criteriaValue: 7, xpReward: 60, tier: 'SILVER', sortOrder: 11 },
  { code: 'COURSE_COMPLETE', name: 'Course Finisher', description: 'Complete every lesson in a course.', icon: 'GraduationCap', criteriaType: 'COURSE_COMPLETIONS', criteriaValue: 1, xpReward: 120, tier: 'GOLD', sortOrder: 12 },
];

const DEMO_USERS = [
  { email: 'admin@learnmate.dev', name: 'Ava Admin', password: 'Admin1234!', role: 'ADMIN', timezone: 'UTC', avatarColor: 'violet' },
  { email: 'demo@learnmate.dev', name: 'Demo Learner', password: 'Demo1234!', role: 'STUDENT', timezone: 'Europe/London', avatarColor: 'indigo' },
  { email: 'maya@learnmate.dev', name: 'Maya Patel', password: 'Maya1234!', role: 'STUDENT', timezone: 'Asia/Kolkata', avatarColor: 'emerald' },
  { email: 'leo@learnmate.dev', name: 'Leo Martins', password: 'Leo12345!', role: 'STUDENT', timezone: 'America/New_York', avatarColor: 'amber' },
];

function daysAgo(days, hour = 18) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function upsertUser({ email, name, password, role, timezone, avatarColor }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role, timezone, avatarColor, dailyGoalXp: 60, weeklyGoalDays: 5 },
    update: { name, passwordHash, role, timezone, avatarColor },
  });
}

async function seedCourse(courseDefinition) {
  const course = await prisma.course.upsert({
    where: { slug: courseDefinition.slug },
    create: {
      slug: courseDefinition.slug,
      title: courseDefinition.title,
      tagline: courseDefinition.tagline,
      description: courseDefinition.description,
      category: courseDefinition.category,
      difficulty: courseDefinition.difficulty,
      estimatedMinutes: courseDefinition.estimatedMinutes,
      published: true,
    },
    update: {
      title: courseDefinition.title,
      tagline: courseDefinition.tagline,
      description: courseDefinition.description,
      category: courseDefinition.category,
      difficulty: courseDefinition.difficulty,
      estimatedMinutes: courseDefinition.estimatedMinutes,
      published: true,
    },
  });

  const lessonMap = new Map();
  let topicOrder = 0;
  let lessonOrder = 0;

  for (const topic of courseDefinition.topics) {
    topicOrder += 1;
    const topicRow = await prisma.topic.upsert({
      where: { courseId_order: { courseId: course.id, order: topicOrder } },
      create: { courseId: course.id, title: topic.title, order: topicOrder },
      update: { title: topic.title },
    });

    for (const lesson of topic.lessons) {
      lessonOrder += 1;
      const lessonRow = await prisma.lesson.upsert({
        where: { courseId_order: { courseId: course.id, order: lessonOrder } },
        create: {
          courseId: course.id,
          topicId: topicRow.id,
          title: lesson.title,
          summary: lesson.summary,
          content: lesson.content,
          order: lessonOrder,
          estimatedMinutes: lesson.minutes,
          xpReward: 10,
        },
        update: {
          topicId: topicRow.id,
          title: lesson.title,
          summary: lesson.summary,
          content: lesson.content,
          estimatedMinutes: lesson.minutes,
        },
      });
      lessonMap.set(lesson.title, lessonRow);
    }
  }

  const quiz = await prisma.quiz.upsert({
    where: { courseId_title: { courseId: course.id, title: courseDefinition.quiz.title } },
    create: {
      courseId: course.id,
      title: courseDefinition.quiz.title,
      description: courseDefinition.quiz.description,
      difficulty: courseDefinition.quiz.difficulty,
      passingScore: courseDefinition.quiz.passingScore,
      order: 1,
    },
    update: {
      description: courseDefinition.quiz.description,
      difficulty: courseDefinition.quiz.difficulty,
      passingScore: courseDefinition.quiz.passingScore,
    },
    include: { questions: true },
  });

  const questions = [];
  let questionOrder = 0;
  for (const question of courseDefinition.quiz.questions) {
    questionOrder += 1;
    const questionRow = await prisma.question.upsert({
      where: { quizId_order: { quizId: quiz.id, order: questionOrder } },
      create: {
        quizId: quiz.id,
        prompt: question.prompt,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        topic: question.topic,
        difficulty: courseDefinition.quiz.difficulty,
        order: questionOrder,
      },
      update: {
        prompt: question.prompt,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        topic: question.topic,
        difficulty: courseDefinition.quiz.difficulty,
      },
    });
    questions.push(questionRow);
  }

  const flashcards = [];
  for (const card of courseDefinition.flashcards) {
    const flashcard = await prisma.flashcard.upsert({
      where: { courseId_front: { courseId: course.id, front: card.front } },
      create: { courseId: course.id, topic: card.topic, front: card.front, back: card.back },
      update: { topic: card.topic, back: card.back },
    });
    flashcards.push(flashcard);
  }

  return { course, lessons: [...lessonMap.values()], quiz, questions, flashcards };
}

async function seedDemoActivity(seeded, users) {
  const [webs, data] = seeded;
  const demo = users.find((user) => user.email === 'demo@learnmate.dev');
  const maya = users.find((user) => user.email === 'maya@learnmate.dev');
  const leo = users.find((user) => user.email === 'leo@learnmate.dev');

  const enrollmentPlan = [
    { user: demo, course: webs.course, daysAgo: 20, completed: webs.lessons.slice(0, 3) },
    { user: demo, course: data.course, daysAgo: 9, completed: data.lessons.slice(0, 1) },
    { user: maya, course: webs.course, daysAgo: 18, completed: webs.lessons.slice(0, 5) },
    { user: maya, course: seeded[2].course, daysAgo: 7, completed: [] },
    { user: leo, course: webs.course, daysAgo: 15, completed: webs.lessons.slice(0, 2) },
  ];

  const xpRows = [];
  const goalRows = [];

  for (const plan of enrollmentPlan) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: plan.user.id, courseId: plan.course.id } },
      create: {
        userId: plan.user.id,
        courseId: plan.course.id,
        enrolledAt: daysAgo(plan.daysAgo),
        lastAccessedAt: daysAgo(1),
      },
      update: {
        enrolledAt: daysAgo(plan.daysAgo),
        lastAccessedAt: daysAgo(1),
      },
    });

    for (const lesson of plan.completed) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: plan.user.id, lessonId: lesson.id } },
        create: { userId: plan.user.id, lessonId: lesson.id, completedAt: daysAgo(plan.daysAgo - 1) },
        update: {},
      });
      xpRows.push({
        userId: plan.user.id,
        courseId: plan.course.id,
        amount: 10,
        reason: 'LESSON_COMPLETE',
        sourceType: 'Lesson',
        sourceId: lesson.id,
        idempotencyKey: `seed:lesson:${plan.user.id}:${lesson.id}`,
        createdAt: daysAgo(plan.daysAgo - 1),
      });
    }
  }

  // Seeded quiz attempts create realistic leaderboard profiles.
  const attemptPlan = [
    { user: demo, seededCourse: webs, scores: [60, 85], days: [12, 4], attemptStart: 1 },
    { user: demo, seededCourse: data, scores: [70], days: [2], attemptStart: 1 },
    { user: maya, seededCourse: webs, scores: [95], days: [3], attemptStart: 1 },
    { user: leo, seededCourse: webs, scores: [50, 65], days: [10, 5], attemptStart: 1 },
  ];

  for (const plan of attemptPlan) {
    const existing = await prisma.quizAttempt.count({
      where: { userId: plan.user.id, quizId: plan.seededCourse.quiz.id },
    });
    if (existing > 0) continue;

    for (let index = 0; index < plan.scores.length; index += 1) {
      const score = plan.scores[index];
      const servedQuestions = plan.seededCourse.questions.slice(0, 5);
      const correctCount = Math.round((score / 100) * servedQuestions.length);
      const submittedAt = daysAgo(plan.days[index]);

      const attempt = await prisma.quizAttempt.create({
        data: {
          userId: plan.user.id,
          quizId: plan.seededCourse.quiz.id,
          status: 'SUBMITTED',
          attemptNumber: plan.attemptStart + index,
          questionIds: servedQuestions.map((question) => question.id),
          totalCount: servedQuestions.length,
          correctCount,
          score,
          startedAt: new Date(submittedAt.getTime() - 8 * 60 * 1000),
          submittedAt,
          verified: true,
        },
      });

      await prisma.quizAnswer.createMany({
        data: servedQuestions.map((question, questionIndex) => {
          const isCorrect = questionIndex < correctCount;
          const selectedIndex = isCorrect ? question.correctIndex : (question.correctIndex + 1) % question.options.length;
          return { attemptId: attempt.id, questionId: question.id, selectedIndex, isCorrect };
        }),
        skipDuplicates: true,
      });

      xpRows.push({
        userId: plan.user.id,
        courseId: plan.seededCourse.course.id,
        amount: 5 + correctCount * 2,
        reason: 'QUIZ_COMPLETE',
        sourceType: 'QuizAttempt',
        sourceId: attempt.id,
        idempotencyKey: `seed:quiz:${attempt.id}`,
        createdAt: submittedAt,
      });
    }
  }

  // Daily goals across the last two weeks, with today's state varied.
  const goalPlan = [
    { user: demo, completedOffsets: [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14], today: true },
    { user: maya, completedOffsets: [2, 3, 5, 6, 8, 10], today: false },
    { user: leo, completedOffsets: [1, 4, 7], today: false },
  ];

  for (const plan of goalPlan) {
    const tz = plan.user.timezone;
    const today = todayKey(tz);
    for (let offset = 0; offset <= 15; offset += 1) {
      const dateKey = addDaysToKey(today, -offset);
      const completed = offset === 0 ? plan.today : plan.completedOffsets.includes(offset);
      if (!completed && offset > 0) continue;

      const target = 60;
      // Completed goals record the verified learning XP for that day. The
      // separate daily-goal bonus is a reward and is not part of this total.
      const seededXp = completed ? target : 25;
      const goal = await prisma.dailyGoal.upsert({
        where: { userId_date: { userId: plan.user.id, date: dateKeyToDbDate(dateKey) } },
        create: {
          userId: plan.user.id,
          date: dateKeyToDbDate(dateKey),
          targetXp: target,
          xpEarned: seededXp,
          completed,
          completedAt: completed ? daysAgo(offset, 9) : null,
        },
        update: {
          completed,
          completedAt: completed ? daysAgo(offset, 9) : null,
          targetXp: target,
          xpEarned: seededXp,
        },
      });

      if (offset === 0 && plan.today) {
        // Give today a real, matching source of XP so the completed goal is
        // internally consistent on the dashboard and analytics pages.
        xpRows.push({
          userId: plan.user.id,
          amount: target,
          reason: 'ADMIN_ADJUSTMENT',
          sourceType: 'Seed',
          sourceId: `seed:demo-today:${dateKey}`,
          idempotencyKey: `seed:demo-today:${dateKey}`,
          createdAt: daysAgo(0, 9),
        });
      }

      if (completed) {
        goalRows.push({
          userId: plan.user.id,
          amount: 10,
          reason: 'DAILY_GOAL',
          sourceType: 'DailyGoal',
          sourceId: goal.id,
          idempotencyKey: `seed:goal:${plan.user.id}:${dateKey}`,
          createdAt: daysAgo(offset, 9),
        });
      }
    }
  }

  // A little extra XP activity for charts and level display.
  for (const plan of [
    { user: demo, amount: 40, key: 'seed:extra:demo' },
    { user: maya, amount: 25, key: 'seed:extra:maya' },
    { user: leo, amount: 15, key: 'seed:extra:leo' },
  ]) {
    xpRows.push({
      userId: plan.user.id,
      amount: plan.amount,
      reason: 'ADMIN_ADJUSTMENT',
      sourceType: 'Seed',
      sourceId: plan.key,
      idempotencyKey: plan.key,
      createdAt: daysAgo(6, 9),
    });
  }

  await prisma.xPTransaction.createMany({ data: xpRows, skipDuplicates: true });
  await prisma.xPTransaction.createMany({ data: goalRows, skipDuplicates: true });
}

async function main() {
  console.log('Seeding LearnMate...');

  const achievements = [];
  for (const achievement of ACHIEVEMENTS) {
    achievements.push(
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        create: achievement,
        update: achievement,
      })
    );
  }

  const seededCourses = [];
  for (const courseDefinition of COURSES) {
    seededCourses.push(await seedCourse(courseDefinition));
    console.log(`  Course ready: ${courseDefinition.title}`);
  }

  const users = [];
  for (const demoUser of DEMO_USERS) {
    users.push(await upsertUser(demoUser));
  }

  await seedDemoActivity(seededCourses, users);

  // Converge seeded achievement unlocks during the seed itself. Achievement
  // XP is awarded once per badge, so doing it here keeps total XP stable on the
  // first dashboard visit (instead of jumping on first evaluation).
  for (const seededUser of users) {
    for (let pass = 0; pass < 4; pass += 1) {
      const { unlocked } = await evaluateAchievements(seededUser.id);
      if (unlocked.length === 0) break;
    }
  }

  // Seeded badges represent past activity. Spread their XP over the previous
  // week so running the seed does not create an artificial spike on today's
  // analytics chart. Rows already backdated no longer match this window.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  for (const seededUser of users) {
    const badgeRows = await prisma.xPTransaction.findMany({
      where: { userId: seededUser.id, reason: 'ACHIEVEMENT', createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'asc' },
    });
    for (let index = 0; index < badgeRows.length; index += 1) {
      await prisma.xPTransaction.update({
        where: { id: badgeRows[index].id },
        data: { createdAt: daysAgo(Math.min(6, 1 + index), 12) },
      });
    }
  }

  const counts = {
    courses: await prisma.course.count(),
    lessons: await prisma.lesson.count(),
    questions: await prisma.question.count(),
    flashcards: await prisma.flashcard.count(),
    achievements: await prisma.achievement.count(),
    users: await prisma.user.count(),
  };
  console.log('Seed complete:', counts);
  console.log('Demo login: demo@learnmate.dev / Demo1234!');
  console.log('Admin login: admin@learnmate.dev / Admin1234!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
