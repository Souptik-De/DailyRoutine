const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src/pages/Dashboard.tsx'),
  path.join(__dirname, 'src/pages/History.tsx'),
  path.join(__dirname, 'src/pages/Habits.tsx'),
  path.join(__dirname, 'src/pages/Journal.tsx')
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Remove background blur blobs in main UI (glows)
  content = content.replace(/<div className="absolute[^>]*blur[^>]*pointer-events-none[^>]*>\s*<\/div>/g, '');
  content = content.replace(/<div className="absolute[^>]*blur[^>]*animate-pulse[^>]*>\s*<\/div>/g, '');
  content = content.replace(/<div className="absolute[^>]*blur[^>]*group-hover[^>]*>\s*<\/div>/g, '');
  
  // Replace colors
  content = content.replace(/violet-[45]00\/10/g, 'brand-500/10');
  content = content.replace(/violet-[45]00\/20/g, 'brand-500/20');
  content = content.replace(/violet-[45]00\/30/g, 'brand-500/30');
  content = content.replace(/violet-200/g, 'brand-200');
  content = content.replace(/violet-300/g, 'brand-300');
  content = content.replace(/violet-400/g, 'brand-400');
  content = content.replace(/violet-500/g, 'brand-500');
  content = content.replace(/violet-600/g, 'brand-600');
  
  content = content.replace(/pink-[45]00\/10/g, 'brand-500/10');
  content = content.replace(/pink-[45]00\/20/g, 'brand-500/20');
  content = content.replace(/pink-[45]00\/30/g, 'brand-500/30');
  content = content.replace(/pink-400/g, 'brand-400');
  content = content.replace(/pink-500/g, 'brand-500');
  content = content.replace(/pink-600/g, 'brand-600');
  
  content = content.replace(/fuchsia-[56]00/g, 'brand-300');
  content = content.replace(/rose-[56]00/g, 'brand-400');
  content = content.replace(/indigo-[56]00/g, 'brand-500');
  content = content.replace(/blue-[45]00/g, 'brand-400');
  
  content = content.replace(/emerald-[45]00\/10/g, 'brand-500/10');
  content = content.replace(/emerald-[45]00\/20/g, 'brand-500/20');
  content = content.replace(/emerald-400/g, 'brand-400');
  content = content.replace(/emerald-500/g, 'brand-500');
  content = content.replace(/emerald-600/g, 'brand-600');
  
  content = content.replace(/orange-[45]00\/10/g, 'brand-500/10');
  content = content.replace(/orange-[45]00\/20/g, 'brand-500/20');
  content = content.replace(/orange-200/g, 'brand-200');
  content = content.replace(/orange-400/g, 'brand-400');
  content = content.replace(/orange-500/g, 'brand-500');

  // Remove box-shadows that act as glows and replace with depth
  content = content.replace(/shadow-\[0_0_[^\]]+\]/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.4)]');
  content = content.replace(/drop-shadow-\[0_0_[^\]]+\]/g, 'drop-shadow-md');
  content = content.replace(/shadow-\[0_4px_14px_0_[^\]]+\]/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.4)]');
  content = content.replace(/shadow-\[0_4px_20px_[^\]]+\]/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.4)]');
  
  fs.writeFileSync(f, content);
  console.log(`Updated ${f}`);
});
