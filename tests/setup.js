// Mock modules that cause issues with Jest in ESM mode
jest.mock('../utils/logger.js', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  }
}), { virtual: true });

// Mock chalk
jest.mock('chalk', () => ({
  default: {
    red: jest.fn(text => text),
    green: jest.fn(text => text),
    yellow: jest.fn(text => text),
    blue: jest.fn(text => text),
    cyan: jest.fn(text => text),
    magenta: jest.fn(text => text),
    gray: jest.fn(text => text),
    white: jest.fn(text => text),
    bold: jest.fn(text => text),
  }
}), { virtual: true });

// Mock css-tree
jest.mock('css-tree', () => ({
  parse: jest.fn((content, options) => ({
    type: 'StyleSheet',
    content
  })),
  walk: jest.fn((ast, options) => {
    const content = ast.content || '';
    // Extract class names with a simple regex for testing
    const classMatches = content.match(/\.([a-zA-Z0-9_-]+)\s*\{/g) || [];
    const classNames = classMatches.map(match => match.replace(/[{.]/g, '').trim());
    
    // Call visitor functions with mock nodes
    if (options.visit === 'Rule' && options.enter && content.includes('.unused-class')) {
      options.enter({
        prelude: {
          type: 'SelectorList',
          children: classNames.map(name => ({
            type: 'Selector',
            name
          }))
        }
      });
    }
    
    if (options.visit === 'ClassSelector' && options.enter) {
      classNames.forEach(name => {
        if (content.includes(`.${name}`)) {
          options.enter({
            name,
            loc: { 
              start: { line: 1, column: 1 }
            }
          });
        }
      });
    }
  }),
  generate: jest.fn((ast) => {
    // For testing, if content includes unused-class, return without it
    // Otherwise return the original content
    const content = ast.content || '';
    if (content.includes('.unused-class')) {
      return content.replace(/\.unused-class\s*\{[^}]*\}/g, '');
    }
    return content;
  })
}), { virtual: true });