import { AppColor } from './app-color';
import { WHITE, BLACK } from './constants';

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
   * @param colorArea - 0 for customerColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   */
  static getColorObject(color: string, lightness?: number, colorArea?: number): AppColor {
    if (!colorArea) {
      colorArea = 0;
    }
    let appColor = new AppColor('');
    if (color && color !== '' && colorArea === 0) {
      // customer color
      const colorNumber = Number(color.trim().substr(0, 2));
      if (colorNumber > 0 && colorNumber <= 99) {
        if (!lightness || lightness < 40) {
          lightness = 40;
        }
        // we define our hue spectrum for colorNumbers 10 to 99
        // 1 - 9 are not used for customer colors - but they would generate hue values 30 to 55
        // 10 - 49 have hue values 55 to 154
        // with a gap ("cold spectrum", reserved for category colors) from hue 155 to hue 264
        // 50 - 99 have hue values 265 ( unil 360) to 30
        appColor.setHue(colorNumber < 50 ? colorNumber * 2.5 + 30 : Math.floor((colorNumber * 2.5 + 140) % 360) );
        appColor.setSaturation(100);
        appColor.setLightness(lightness);
      } else {
        // customer has specific color string ....
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
   * @param color color string - mandant.customerColor, category.categoryColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   *    in ml custom color number schema and lightness is not provided
   * @param colorArea - 0 for customerColor, 1 for categoryColor, 2 for timeSpanCategoryColor
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
   * @param color color string - mandant.customerColor or category.categoryColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   *    in ml custom color number schema and lightness is not provided
   * @param colorArea - 0 for customerColor, 1 for categoryColor, 2 for timeSpanCategoryColor
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
   * @param color string - usually mandant.customerColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   *    in ml custom color number schema and lightness is not provided
   * @param colorArea - 0 for customerColor, 1 for categoryColor, 2 for timeSpanCategoryColor
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
   * @param color string - usually mandant.customerColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   *    in ml custom color number schema and lightness is not provided
   * @param colorArea - 0 for customerColor, 1 for categoryColo, 2 for timeSpanCategoryColor
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
   * @param color string - usually mandant.customerColor in database
   * @param lightness - optional: lighntness percentage from 0 to 100 - set to 40%  if color is a number
   *    in ml custom color number schema and lightness is not provided
   * @param colorArea - 0 for customerColor, 1 for categoryColor, 2 for timeSpanCategoryColor
   * @param style - optional: existing style to be enhanced

   */
  static getBgBorderColorStyle(color: string, lightness?: number, colorArea?: number, style?: Object) {
    const s = this.getBgColorStyle(color, lightness, colorArea, style);
    const t = this.getBorderStyle(color, lightness, colorArea, s);
    return this.getColorStyle(color, lightness, colorArea, t);
  }

}
