import { buildSkillUrl } from './src/mcp-client.mjs';

// Test case from the issue: frontend-design skill from anthropics/skills at /skills path
const result = buildSkillUrl({
  skillName: 'frontend-design',
  baseUrl: 'https://github.com/anthropics/skills',
  skillPath: '/skills',
  version: 'v1',
});

console.log('Test: Custom repo with GitHub URL');
console.log('==================================');
console.log('Input:');
console.log('  skillName: frontend-design');
console.log('  baseUrl: https://github.com/anthropics/skills');
console.log('  skillPath: /skills');
console.log('  version: v1');
console.log('\nGenerated URLs:');
console.log('Primary:', result.primary);
console.log('Alternatives:');
result.alternatives.forEach((url, i) => console.log(`  [${i+1}]`, url));

console.log('\nValidation:');
console.log('✓ All URLs contain raw.githubusercontent.com:', result.all.every(url => url.includes('raw.githubusercontent.com')));
console.log('✓ All URLs contain /skills/frontend-design:', result.all.every(url => url.includes('/skills/frontend-design')));
console.log('✓ Primary is skill.md file:', result.primary.endsWith('skill.md'));
console.log('✓ Has fallback alternatives:', result.alternatives.length > 0);
