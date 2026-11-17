import { AppColor } from './app-color';
import { WHITE, BLACK } from './constants';
import { DAISY_HEX } from './constants-daisy';
import { TAILWIND_HEX } from './constants-tlwnd';

export class StyleFactory {

  static addAttribute(attributeName: string, attributeValue: string, style?: Object): Object {
    let newStyle: { [key: string]: any } = {};
    if (style) {
      // cloning style object
      newStyle = { ...style };
    }
    newStyle[attributeName] = attributeValue;
    return newStyle;
  }

  static addBgStyle(colorString: string, style?: Object) {
    return this.addAttribute( 'background-color', colorString, style);
  }

  static addBorderStyle(colorString: string, style?: Object) {
    return this.addAttribute('border-color', colorString, style);
  }

  static addColorStyle(colorString: string, style?: Object) {
    return this.addAttribute('color', colorString, style);
  }

  static addFontFamilyStyle(familyString: string, style?: Object) {
    return this.addAttribute('font-family', familyString, style);
  }

  static addFontWeightStyle(weightString: string, style?: Object) {
    return this.addAttribute('font-weight', weightString, style);
  }

  static addFontStyle(styleString: string, style?: Object) {
    return this.addAttribute('font-style', styleString, style);
  }

  static addDecorationStyle(styleString: string, style?: Object) {
    return this.addAttribute('text-decoration', styleString, style);
  }

  /**
   * getColorObject
   *
   * @param color - is a standard ml color number 10 - 99 or a color string
   * @param lightness value form 0 to 100 (%) - values below 40 are set to 40
   * @param colorArea - 0 for contactColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   */
  static getColorObject(color: string, lightness?: number, colorArea?: number): AppColor {
    if (!colorArea) {
      colorArea = 0;
    }
    let appColor = new AppColor('');
    if (color && color !== '' && colorArea === 0) {
      // contact color
      const colorNumber = Number(color.trim().substr(0, 2));
      if (colorNumber > 0 && colorNumber <= 99) {
        if (!lightness || lightness < 40) {
          lightness = 40;
        }
        // we define our hue spectrum for colorNumbers 10 to 99
        // 1 - 9 are not used for contact colors - but they would generate hue values 30 to 55
        // 10 - 49 have hue values 55 to 154
        // with a gap ("cold spectrum", reserved for category colors) from hue 155 to hue 264
        // 50 - 99 have hue values 265 ( unil 360) to 30
        appColor.setHue(colorNumber < 50 ? colorNumber * 2.5 + 30 : Math.floor((colorNumber * 2.5 + 140) % 360) );
        appColor.setSaturation(100);
        appColor.setLightness(lightness);
      } else {
        // contact has specific color string ....
        appColor = new AppColor(color);
      }
    } else if (color && color !== '' && colorArea === 1) {
      const colorNumber = Number(color.trim().substr(0, 1));
      if (colorNumber >= 0 && colorNumber <= 9) {
        if (!lightness || lightness < 40) {
          lightness = 40;
        }
        // we define our hue spectrum for colorNumbers 0 to 9
        // (0 as default, 1 - 9) are used for category colors - they generate hue values 150 to hue 268
        appColor.setHue(colorNumber * 12 + 150 );
        appColor.setSaturation(100);
        appColor.setLightness(lightness);
      } else {
        appColor = new AppColor(color);
        // category has specific color string ....
        if (!lightness || lightness < 40) {
          lightness = 40;
        }
        appColor.setLightness(lightness);
      }
    } else if (color && color !== '' && colorArea === 2) {
        // time span category has specific color string ....
        appColor = new AppColor(color);
         if (!lightness || lightness < 40) {
          lightness = 40;
        }
        appColor.setLightness(lightness);
    } else {
      // we have no color - default color has saturation 0%
      // we set lightness 80% = light gray
      // console.log('dafault color #', mlColor.getHex());
      // console.log('dafault color hsl', mlColor.getHsl());
      appColor.setLightness(80);
      // console.log('dafault color 50% #', mlColor.getHex());
      // console.log('dafault color 50% hsl', mlColor.getHsl());
    }
    return appColor;
  }


  /**
   * getBgStyle
   *  gets / adde style with background color, color is parameter
   *
   * @param color color string - contactColor, category.categoryColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   * @param colorArea - 0 for contactColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   * @param style - optional: existing style to be enhanced
   */
  static getBgStyle(color: string, lightness?: number, colorArea?: number, style?: Object) {
    const col = this.getColorObject(color, lightness, colorArea);
    return this.addBgStyle(col.getHex(), style);
  }

  /**
   * getBorderStyle
   *  gets / adde style with border color, color is parameter
   *
   * @param color color string - contactColor or category.categoryColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   * @param colorArea - 0 for contactColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   * @param style - optional: existing style to be enhanced
   */
  static getBorderStyle(color: string, lightness?: number, colorArea?: number, style?: Object) {
    const col = this.getColorObject(color, lightness, colorArea);
    let newStyle: { [key: string]: any } = {};
    // set lightness of BorderColor *0,7 if lightness > 80%
    if (col.getLightness() > 80) {
      const borderColor = col;
      borderColor.setLightness(borderColor.getLightness() * 0.7)
      newStyle = this.addBorderStyle(borderColor.getHex(), style);
    } else {
      newStyle = this.addBorderStyle(col.getHex(), style);
    }
    return newStyle;
  }

  /**
   * getColorStyle
   *  gets / adde style with color (BLACK/WHITE) for text in background colored elements
   *
   * @param color string - usually contactColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   * @param colorArea - 0 for contactColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   * @param style - optional: existing style to be enhanced
   */
  static getColorStyle(color: string, lightness?: number, colorArea?: number, style?: Object) {
    let newStyle: { [key: string]: any } = {};
    const col = this.getColorObject(color, lightness, colorArea);
    // set color to black/white depending on perceived lghtness
    if (col.getPerceivedLightness() > 0.5) {
      newStyle = this.addColorStyle(BLACK, style);
    } else {
      newStyle = this.addColorStyle(WHITE, style);
    }
    return newStyle;
  }

  /**
   * getBgColorStyle
   *  gets / adde style with backgroundColor and color for text
   *
   * @param color string - usually contactColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   * @param colorArea - (not longer used - we have only contactColors in this way) 0 for contactColor, 1 for categoryColo, 2 for timeSpanCategoryColor
   * @param style - optional: existing style to be enhanced

   */
  static getBgColorStyle(color: string, lightness?: number, colorArea?: number, style?: Object) {
    const s = this.getBgStyle(color, lightness, colorArea, style);
    return this.getColorStyle(color, lightness, colorArea, s);
  }

  /**
   * getBgBoderColorStyle
   *  gets / adde style with backgroundColor, border color  and color for text
   *
   * @param color string - usually contactColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   * @param colorArea - 0 for contactColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   * @param style - optional: existing style to be enhanced

   */
  static getBgBorderColorStyle(color: string, lightness?: number, colorArea?: number, style?: Object) {
    const s = this.getBgColorStyle(color, lightness, colorArea, style);
    const t = this.getBorderStyle(color, lightness, colorArea, s);
    return this.getColorStyle(color, lightness, colorArea, t);
  }

  /**
   * getTextColor
   *  gets text color depending on perceived lightness of beckgourn color
   *
   * @param backgroundColor string - contactColor (1 - 99) or color HEX string or color varable (tailwind, daisy)
   * @returns text color string (black or white) 

   */
  static getTextColor(backgroundColor: string): string {
    let perceivedLightness = 0;
    if (backgroundColor && backgroundColor !== '') {
      // check contact  color
      const possibleColorCode= backgroundColor.trim().substr(0, 2);
      const colorNumber = Number(possibleColorCode);
      if (colorNumber > 0 && colorNumber <= 99 && backgroundColor.trim().substring(0, 1) !== '#') {
        const colorObject = this.getColorObject(backgroundColor);
        const rgbString = colorObject.getRgb();
        const rgbElements = rgbString.split(',');
        if (rgbElements.length === 3) {
          perceivedLightness = this.getPerceivedLightness(Number(rgbElements[0]), Number(rgbElements[1]), Number(rgbElements[2]));
        }
      } else {
        // these hex functions are needed fpr perceivedLightness calculation - but original background color content is not touched!!
        let hex = TAILWIND_HEX[backgroundColor];
        if (!hex) {
          // we assume standard daisy (light) theme
          hex = DAISY_HEX[backgroundColor];
          if (!hex) {
            hex = this.getHexColor(backgroundColor);
            if (hex === '') {
              hex = backgroundColor;
            }
          }
        }
        const { r, g, b } = this.hexToRgb(hex);
        perceivedLightness = this.getPerceivedLightness(r, g, b);
      }
    }
    if (perceivedLightness > 0.5) {
      return BLACK;
    } else if (perceivedLightness > 0){
      return WHITE;
    } else {
      return '';
    }
  }

  static  hexToRgb(hex: string) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /**
   * getPerceivedLightness()
   *  relative Luminance nach WCAG (BT.709 + Gammakorrektur)
   *
   * @param r number, part of r,g,b color representation
   * @param g number, part of r,g,b color representation
   * @param b number, part of r,g,b color representation
   * @returns relative lightness as numeric value between 0 and 1
   * 
   */
  static getPerceivedLightness(r: number, g: number, b: number): number {
    const lin = (c: number) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  // returns 7 characters long hex string with leading #
  static getHexColor(color: string): string {
    const colorNames =  ['AliceBlue','AntiqueWhite','Aqua','Aquamarine','Azure','Beige','Bisque','Black','BlanchedAlmond','Blue','BlueViolet','Brown','BurlyWood','CadetBlue','Chartreuse','Chocolate','Coral','CornflowerBlue','Cornsilk','Crimson','Cyan','DarkBlue','DarkCyan','DarkGoldenRod','DarkGray','DarkGrey','DarkGreen','DarkKhaki','DarkMagenta','DarkOliveGreen','DarkOrange','DarkOrchid','DarkRed','DarkSalmon','DarkSeaGreen','DarkSlateBlue','DarkSlateGray','DarkSlateGrey','DarkTurquoise','DarkViolet','DeepPink','DeepSkyBlue','DimGray','DimGrey','DodgerBlue','FireBrick','FloralWhite','ForestGreen','Fuchsia','Gainsboro','GhostWhite','Gold','GoldenRod','Gray','Grey','Green','GreenYellow','HoneyDew','HotPink','IndianRed','Indigo','Ivory','Khaki','Lavender','LavenderBlush','LawnGreen','LemonChiffon','LightBlue','LightCoral','LightCyan','LightGoldenRodYellow','LightGray','LightGrey','LightGreen','LightPink','LightSalmon','LightSeaGreen','LightSkyBlue','LightSlateGray','LightSlateGrey','LightSteelBlue','LightYellow','Lime','LimeGreen','Linen','Magenta','Maroon','MediumAquaMarine','MediumBlue','MediumOrchid','MediumPurple','MediumSeaGreen','MediumSlateBlue','MediumSpringGreen','MediumTurquoise','MediumVioletRed','MidnightBlue','MintCream','MistyRose','Moccasin','NavajoWhite','Navy','OldLace','Olive','OliveDrab','Orange','OrangeRed','Orchid','PaleGoldenRod','PaleGreen','PaleTurquoise','PaleVioletRed','PapayaWhip','PeachPuff','Peru','Pink','Plum','PowderBlue','Purple','RebeccaPurple','Red','RosyBrown','RoyalBlue','SaddleBrown','Salmon','SandyBrown','SeaGreen','SeaShell','Sienna','Silver','SkyBlue','SlateBlue','SlateGray','SlateGrey','Snow','SpringGreen','SteelBlue','Tan','Teal','Thistle','Tomato','Turquoise','Violet','Wheat','White','WhiteSmoke','Yellow','YellowGreen'];
    const hexValues = ['f0f8ff','faebd7','00ffff','7fffd4','f0ffff','f5f5dc','ffe4c4','000000','ffebcd','0000ff','8a2be2','a52a2a','deb887','5f9ea0','7fff00','d2691e','ff7f50','6495ed','fff8dc','dc143c','00ffff','00008b','008b8b','b8860b','a9a9a9','a9a9a9','006400','bdb76b','8b008b','556b2f','ff8c00','9932cc','8b0000','e9967a','8fbc8f','483d8b','2f4f4f','2f4f4f','00ced1','9400d3','ff1493','00bfff','696969','696969','1e90ff','b22222','fffaf0','228b22','ff00ff','dcdcdc','f8f8ff','ffd700','daa520','808080','808080','008000','adff2f','f0fff0','ff69b4','cd5c5c','4b0082','fffff0','f0e68c','e6e6fa','fff0f5','7cfc00','fffacd','add8e6','f08080','e0ffff','fafad2','d3d3d3','d3d3d3','90ee90','ffb6c1','ffa07a','20b2aa','87cefa','778899','778899','b0c4de','ffffe0','00ff00','32cd32','faf0e6','ff00ff','800000','66cdaa','0000cd','ba55d3','9370db','3cb371','7b68ee','00fa9a','48d1cc','c71585','191970','f5fffa','ffe4e1','ffe4b5','ffdead','000080','fdf5e6','808000','6b8e23','ffa500','ff4500','da70d6','eee8aa','98fb98','afeeee','db7093','ffefd5','ffdab9','cd853f','ffc0cb','dda0dd','b0e0e6','800080','663399','ff0000','bc8f8f','4169e1','8b4513','fa8072','f4a460','2e8b57','fff5ee','a0522d','c0c0c0','87ceeb','6a5acd','708090','708090','fffafa','00ff7f','4682b4','d2b48c','008080','d8bfd8','ff6347','40e0d0','ee82ee','f5deb3','ffffff','f5f5f5','ffff00','9acd32']; 
    const index = colorNames.findIndex(_ => _ === color);
    if (index >= 0) {
      return '#' + hexValues[index];
    } else {
      return '';
    }
  }
  
}
