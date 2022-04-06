import * as fs from "fs";
function exec(cmd, handler = function(error, stdout, stderr){console.log(stdout);if(error !== null){console.log(stderr)}})
{
    const childfork = require('child_process');
    return childfork.execSync(cmd, handler);
}


exec('clarinet test --costs > cost_report.txt');

const readfile = fs.readFileSync('./cost_report.txt', { encoding: "utf8" });

const costAnalysis = readfile.substring(
    readfile.lastIndexOf("Contract calls cost synthesis"), 
    readfile.lastIndexOf("Check out the pro tips to improve your testing process:")
);

fs.writeFileSync('./cost_report.txt', costAnalysis);