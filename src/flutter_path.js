class FlutterPath {
  constructor(operations, color, opacity, paintType, strokeWidth, closed) {
    this.operations = operations;
    this.color = color;
    this.opacity = opacity;
    this.paintType = paintType;
    this.strokeWidth = strokeWidth;
    this.closed = closed;
  }
}

const PaintType = {
  Fill: 'Fill',
  Stroke: 'Stroke',
}

class PathOperation {
  createSizeDependentToken(sizeProperty, number, round) {
  
    const roundedNumber = helpers.roundNumber(number, round);

    if (roundedNumber == 0) {
      return '0';
    }

    if (roundedNumber == 1) {
      return `size.${sizeProperty}`;
    }

    return `size.${sizeProperty} * ${roundedNumber}`;
  }
}

class MoveToOperation extends PathOperation {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toFlutterCommand(round = 4) {
    const x = this.createSizeDependentToken('width', this.x, round);
    const y = this.createSizeDependentToken('height', this.y, round);

    return `path.moveTo(${x}, ${y});`;
  }
}

class LineToOperation extends PathOperation {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toFlutterCommand(round = 4) {
    const x = this.createSizeDependentToken('width', this.x, round);
    const y = this.createSizeDependentToken('height', this.y, round);

    return `path.lineTo(${x}, ${y});`;
  }
}

class CubicToOperation extends PathOperation {
  constructor(x1, y1, x2, y2, x3, y3) {
    super();
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.x3 = x3;
    this.y3 = y3;
  }

  toFlutterCommand(round = 4) {
    const x1 = this.createSizeDependentToken('width', this.x1, round);
    const y1 = this.createSizeDependentToken('height', this.y1, round);
    const x2 = this.createSizeDependentToken('width', this.x2, round);
    const y2 = this.createSizeDependentToken('height', this.y2, round);
    const x3 = this.createSizeDependentToken('width', this.x3, round);
    const y3 = this.createSizeDependentToken('height', this.y3, round);

    return `path.cubicTo(${x1}, ${y1}, ${x2}, ${y2}, ${x3}, ${y3});`;
  }
}

class AddOvalOperation extends PathOperation {
  constructor(x, y, radius) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  toFlutterCommand(round = 4) {
    const x = this.createSizeDependentToken('width', this.x, round);
    const y = this.createSizeDependentToken('height', this.y, round);
    const radius = this.createSizeDependentToken('width', this.radius, round);

    return `path.addOval(Rect.fromCircle(center: Offset(${x}, ${y}), radius: ${radius}));`;
  }
}

class FlutterPathPrinter {
  constructor(path) {
    this.path = path;
  }

  print() {
    return "TEST!";
  }
}

class FlutterCustomPaintPrinter {
  print(paths, config) {
    let definition = []
    if (config.clip) {
      definition.push(`class ${config?.name ?? 'MyClipper'} extends CustomClipper<Path> {`);
    } else {
      definition.push(`class ${config?.name ?? 'MyPainter'} extends CustomPainter {`);
    }

    if (config?.pathTracing) {
      definition = definition.concat([
        '',
        '\tfinal double progress;',
        '',
        '\tMyPainter({this.progress = 1.0});'
      ]);
    }

    let linesBefore = []

    if (config.clip) {
      linesBefore = [
        '\t@override',
        '\tPath getClip(Size size) {',
        '\t\tPath path = Path();',
      ];
    } else {
      linesBefore = [
        '\t@override',
        '\tvoid paint(Canvas canvas, Size size) {',
        '\t\tPath path = Path();',
        '\t\tfinal Paint paint = Paint();'
      ];
    }
    let linesAfter = [];

    if (config.clip) {
      linesAfter =
        [
          '\t}',
          '',
          '\t@override',
          '\tbool shouldReclip(covariant CustomClipper<Path> oldClipper) {',
          '\t\treturn true;',
          '\t}',
          '}'
        ]

    } else {
      linesAfter =
        [
          '\t}',
          '',
          '\t@override',
          '\tbool shouldRepaint(CustomPainter oldDelegate) {',
          '\t\treturn true;',
          '\t}',
          '}'
        ]

    }

    let linesPaths = [];

    paths.forEach((path, index) => {
      linesPaths.push('');
      linesPaths.push(`\t\t// Path ${index + 1} ${path.paintType}`);

      if (!config.clip) {
        if (index > 0) {
          linesPaths.push('\t\tpath = Path();');
        }

        let color = path.color;

        if (color == null) {
          color = '000000';
        }

        const opacityString = path.opacity ? `.withOpacity(${path.opacity})` : '';
        const colorCommand = "paint.color = const Color(0xff" + color + ")" + opacityString + ";"
        const colorCommandString = `\t\t${colorCommand}`;

        linesPaths.push(colorCommandString);
        if (path.paintType == PaintType.Stroke) {
          linesPaths.push('\t\tpaint.style = PaintingStyle.stroke;');
          linesPaths.push('\t\tpaint.strokeWidth = ' + (path.strokeWidth ? path.strokeWidth : '1') + ';');
        }
      }

      path.operations.forEach((operation) => {
        linesPaths.push(`\t\t${operation.toFlutterCommand()}`);
      });

      if (path.paintType == PaintType.Stroke && path.closed) {
        linesPaths.push('\t\tpath.close();');
      }

      if (config?.pathTracingAll) {
        linesPaths.push(`\t\tPathMetrics pathMetrics${index} = path.computeMetrics();`);
        linesPaths.push(`\t\tfor (PathMetric pathMetric in pathMetrics${index}) {`);
        linesPaths.push('\t\t\tPath extractPath = pathMetric.extractPath(');
        linesPaths.push('\t\t\t\t0.0,');
        linesPaths.push('\t\t\t\tpathMetric.length * progress,');
        linesPaths.push('\t\t\t);');

        linesPaths.push('\t\t\tcanvas.drawPath(extractPath, paint);');
        linesPaths.push('\t\t}');
      } else if (config?.pathTracing) {
        linesPaths.push('');
        linesPaths.push(`\t\tList<PathMetric> pathMetrics${index} = path.computeMetrics().toList();`);
        linesPaths.push('');

        linesPaths.push(`\t\tfinal numberOfOperations${index} = pathMetrics${index}.length;`);
        linesPaths.push(`\t\tfinal singleOperationTime${index} = 1.0 / numberOfOperations${index};`);
        linesPaths.push(`\t\tfinal index${index} = (progress / singleOperationTime${index}).floor();`);
        linesPaths.push('');

        linesPaths.push(`\t\tif(index${index} > 0) {`);
        linesPaths.push(`\t\t\tList<PathMetric> completePaths = pathMetrics${index}.sublist(0, index${index});`);
        linesPaths.push('\t\t\tfor (final path in completePaths) {');
        linesPaths.push('\t\t\t\tPath extractPath = path.extractPath(');
        linesPaths.push('\t\t\t\t\t0.0,');
        linesPaths.push('\t\t\t\t\tpath.length,');
        linesPaths.push('\t\t\t\t);');
        linesPaths.push('\t\t\t\tcanvas.drawPath(extractPath, paint);');
        linesPaths.push('\t\t\t}');
        linesPaths.push('\t\t}');

        linesPaths.push('');

        linesPaths.push(`\t\tif(index${index} >= numberOfOperations${index}) {`);
        linesPaths.push('\t\t\treturn;');
        linesPaths.push('\t\t}');

        linesPaths.push('');

        linesPaths.push(`\t\tfinal actualMetric${index} = pathMetrics${index}.elementAt(index${index});`);
        linesPaths.push(`\t\tfinal localProgress${index} = (progress - (singleOperationTime${index} * index${index})) / singleOperationTime${index};`);
        linesPaths.push(`\t\tPath extractPath${index} = actualMetric${index}.extractPath(`);
        linesPaths.push('\t\t\t0.0,');
        linesPaths.push(`\t\t\tactualMetric${index}.length * localProgress${index},`);
        linesPaths.push('\t\t);');
        linesPaths.push(`\t\tcanvas.drawPath(extractPath${index}, paint);`);
      } else if(config.clip) {
        linesPaths.push('\t\treturn path;');
      } else {
        linesPaths.push('\t\tcanvas.drawPath(path, paint);');
      }
    });

    return definition
      .concat(linesBefore)
      .concat(linesPaths)
      .concat(linesAfter).join('\n');
  }
}

let helpers = {
  roundNumber: function (num, scale) {
    if (!("" + num).includes("e")) {
      return +(Math.round(num + "e+" + scale) + "e-" + scale);
    } else {
      let arr = ("" + num).split("e");
      let sig = ""
      if (+arr[1] + scale > 0) {
        sig = "+";
      }
      return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
  }
}

module.exports = {
  FlutterCustomPaintPrinter,
  FlutterPath,
  MoveToOperation,
  LineToOperation,
  CubicToOperation,
  AddOvalOperation,
  PaintType,
};
