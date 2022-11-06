#! /usr/bin/env node

const { program } = require('commander');
const SvgToFlutterPathConverter = require('./convert');
const fs = require('fs');

program
  .command('convert')
  .description('Convert svg file to Flutter path')
  .argument('<svgFilePath>')
  .option('-o --output <outputPath>', 'Where to store the output file')
  .option('--path-tracing', 'Calculate path metrics and expose progress property. Default to false')
  .option('--path-tracing-all', 'Calculate path metrics and expose progress property. Draw all path segments at once. Default to false')
  .option('--clip', 'Create clipper instead of a painter. Default to false')
  .action(function(filePath, options) {
    converter = new SvgToFlutterPathConverter();
    let tracing = options.pathTracing ?? false;
    let tracingAll = options.pathTracingAll ?? false;
    let clip = options.clip ?? false;

    let config = {
      pathTracing: tracing && !clip,
      pathTracingAll: tracingAll && !clip,
      clip: clip,
    }
    
    flutterPathString = converter.convertFromFilePath(filePath, config);
    let outputPath = options.output;

    if (!outputPath) {
      console.log(flutterPathString);
      return;
    }

    outputPathFs = !fs.existsSync(outputPath) ? null : fs.lstatSync(outputPath);

    if (outputPathFs !== null && outputPathFs.isDirectory()) {
      outputPath += '/output.dart';
    }

    try {
      fs.writeFileSync(outputPath, flutterPathString);
    } catch (err) {
      console.error(err);
    }
  })

program.parse()
