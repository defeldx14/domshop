process.env.PLAYWRIGHT_BROWSERS_PATH ||= require('node:path').join(__dirname,'.browsers');
const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',timeout:60000,fullyParallel:false,workers:1,use:{baseURL:'http://127.0.0.1:4173',headless:true,serviceWorkers:'block'},projects:[{name:'safari',use:{...devices['iPhone 13'],browserName:'webkit'}},{name:'desktop',use:{channel:'msedge',viewport:{width:1440,height:950}}},{name:'iphone',use:{...devices['iPhone 13'],defaultBrowserType:'chromium',channel:'msedge'}}],webServer:{command:'node tests/server.cjs',url:'http://127.0.0.1:4173/domshop/reader/',reuseExistingServer:true}});



