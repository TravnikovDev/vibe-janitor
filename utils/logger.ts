import chalk from 'chalk';

/**
 * Collection of funny puns and messages for different cleaning stages
 */
const CLEANING_PUNS = {
  start: [
    'Sweeping AI spaghetti...',
    'Hunting zombie code...',
    'Dusting off unused imports...',
    'Untangling dependency webs...',
    'Polishing your codebase...',
    'Vacuuming unused variables...',
    'Taking out the code trash...',
    'Tidying up the code closet...',
    'Scrubbing redundant functions...',
    'Decluttering your project...',
  ],
  middle: [
    'Finding coding dust bunnies...',
    'Mopping up memory leaks...',
    'Washing those dirty hacks away...',
    'Organizing the dependency drawer...',
    'Folding complex functions neatly...',
    'Wiping away code smells...',
    'Sorting the import spaghetti...',
    'Unboxing package inefficiencies...',
    'Rearranging code furniture...',
    'Deodorizing smelly code...',
  ],
  end: [
    'Applying final polish...',
    'Adding that new code smell...',
    'Putting everything in its place...',
    'Making your repo sparkle...',
    'Adding those finishing touches...',
    'Fluffing the code pillows...',
    "Hanging up the 'Clean Code' sign...",
    'Spraying code freshener...',
    'Setting up the code display...',
    'Rolling out the clean code carpet...',
  ],
};

/**
 * Handles all console output with consistent styling
 */
export class Logger {
  private static progressTimer: NodeJS.Timeout | null = null;
  private static currentProgress = 0;
  private static totalSteps = 10;
  private static currentPhase = 'start';
  private static progressBarWidth = 20;

  /**
   * Log a standard message
   */
  static log(message: string): void {
    console.log(message);
  }

  /**
   * Log an informational message (blue)
   */
  static info(message: string): void {
    console.log(chalk.blue(`ℹ️ ${message}`));
  }

  /**
   * Log a success message (green)
   */
  static success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Log a warning message (yellow)
   */
  static warn(message: string): void {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }

  /**
   * Log an error message (red)
   */
  static error(message: string): void {
    console.error(chalk.red(`❌ ${message}`));
  }

  /**
   * Log a welcome message with vibe-janitor's banner
   */
  static welcome(): void {
    console.log(
      chalk.magenta(`
🧹 vibe-janitor activated...
Sweeping up leftover GPT magic ✨

Scanning for:
  🚫 Unused files
  🔗 Dead imports
  🧟 Zombie components
  🐍 Spaghetti logic
`)
    );
  }

  /**
   * Start showing a progress bar with funny cleaning puns
   */
  static startProgress(): void {
    this.currentProgress = 0;
    this.currentPhase = 'start';
    this.updateProgressDisplay();

    this.progressTimer = setInterval(() => {
      this.currentProgress += 1;

      if (this.currentProgress >= this.totalSteps * 0.3 && this.currentPhase === 'start') {
        this.currentPhase = 'middle';
      } else if (this.currentProgress >= this.totalSteps * 0.7 && this.currentPhase === 'middle') {
        this.currentPhase = 'end';
      }

      if (this.currentProgress >= this.totalSteps) {
        this.stopProgress();
        return;
      }

      this.updateProgressDisplay();
    }, 500);
  }

  /**
   * Stop showing the progress bar
   */
  static stopProgress(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
      console.log(); // Add newline after progress is complete
    }
  }

  /**
   * Update the progress bar display
   */
  private static updateProgressDisplay(): void {
    const percentage = this.currentProgress / this.totalSteps;
    const filledBarWidth = Math.floor(this.progressBarWidth * percentage);
    const emptyBarWidth = this.progressBarWidth - filledBarWidth;

    const filledBar = '▓'.repeat(filledBarWidth);
    const emptyBar = '░'.repeat(emptyBarWidth);

    // Get a random pun for the current phase
    const puns = CLEANING_PUNS[this.currentPhase as keyof typeof CLEANING_PUNS];
    const randomPun = puns[Math.floor(Math.random() * puns.length)];

    // Clear the current line and display the progress
    process.stdout.write('\r\x1b[K');
    process.stdout.write(chalk.magenta(`🧹 vibe-janitor [${filledBar}${emptyBar}] ${randomPun}`));
  }

  /**
   * Show progress with different phases - for analysis, cleaning and reporting
   */
  static async runWithProgress<T>(
    task: () => Promise<T>,
    phases = 3,
    phaseLabels = ['Analyzing', 'Cleaning', 'Reporting']
  ): Promise<T> {
    const originalTotalSteps = this.totalSteps;
    let result: T;

    for (let phase = 0; phase < phases; phase++) {
      this.totalSteps = 10; // Reset steps for each phase
      this.currentProgress = 0;
      this.currentPhase = phase === 0 ? 'start' : phase === phases - 1 ? 'end' : 'middle';

      // Show phase information
      console.log(chalk.blue(`\n${phaseLabels[phase]}...\n`));

      // Start progress for this phase
      this.startProgress();

      if (phase === 0) {
        result = await task();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
      }

      // Stop progress for this phase
      this.stopProgress();
    }

    // Restore original total steps
    this.totalSteps = originalTotalSteps;

    return result!;
  }

  /**
   * Format a file path for display
   */
  static formatPath(path: string): string {
    return chalk.cyan(path);
  }
}
