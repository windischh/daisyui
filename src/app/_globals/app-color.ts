import { GlobalFunctions } from './global-functions';

export class AppColor {


  // hex string, length = 4, with leading #
  // is not used, but we accept a string with 3 charactes according to css color definitions when parsing intput
  private shortHexString!: string;

  private rgbObject!: {r: number, g: number, b: number};
  private hslObject!: {h: number, s: number, l: number};

  // opacity is a value between 0 and 1
  // TODO not implemented yet
  private opacity!: number;

  constructor (
    color: string
  ) {
    // we try to guess meaning of color string
    // first we determine length
    if (color.toString().length === 0 ) {
      // we have a null string - set default color
      this.setDefaultColor();
    } else {
      // we trim leading and trailing spaces
      color = color.toString().trim();
      let hexColor = ''
      // if we have leading # we parse rest of string
      if (color.substring(0, 1) === '#') {
        color = color.substring(1);
      }
      if ((color.length === 6 || color.length === 3) && this.isHexString(color)) {
        hexColor = color;
      } else if (!(color.substring(0, 3).toLowerCase() === 'rgb' || color.substring(0, 3).toLowerCase() === 'hsl' )) {
        hexColor = this.getHexColor(color);
      }
      switch (true) {
        case hexColor.length === 6:
          this.setRgb(parseInt(hexColor.substring(0, 2), 16), parseInt(hexColor.substring(2, 4), 16), parseInt(hexColor.substring(4, 6), 16));
          break;
        case hexColor.length === 3:
          this.setRgb(parseInt(hexColor.substring(0, 1) + hexColor.substring(0, 1), 16),
          parseInt(hexColor.substring(1, 2) + hexColor.substring(1, 2), 16),
          parseInt(hexColor.substring(2, 3) + hexColor.substring(2, 3), 16));
          break;
        // if we could not determine short or long color hex string, we check for rgb or hsl construct
        case color.substring(0, 3).toLowerCase() === 'rgb':
          // rgb numbers are enclosed in brackets (   )
          const rgbNumberPart = color.substring(color.indexOf('(') + 1, color.indexOf(')') );
          // rgb numbers are parted by commas
          const rgbArray = rgbNumberPart.split(',');
          if (rgbArray.length < 3) {
            this.setDefaultColor();
          } else {
            this.setRgb(Number(rgbArray[0]), Number(rgbArray[1]), Number(rgbArray[2]));
          }
          break;
        case color.substring(0, 3).toLowerCase() === 'hsl':
          const hslNumberPart = color.substring(color.indexOf('(') + 1, color.indexOf(')') );
          const hslArray = hslNumberPart.split(',');
          if (hslArray.length < 3) {
            this.setDefaultColor();
          } else {
            this.setHsl(Number(hslArray[0]), Number(hslArray[1]), Number(hslArray[2]));
          }
          break;
        default:
          this.setDefaultColor();
          break;
      }
    }
  }

  // default color has hue, saturation, lightness 0 = white
  private setDefaultColor() {
    this.setHsl(0, 0, 0);
  }


  private isHexString(s: string): boolean {
    let isHex = true;
    for (let i = 0; i < s.length; i++) {
      if (!((s.substring(i, i+1) >= '0' && s.substring(i, i+1) <= '9') ||
      (s.substring(i, i+1) >= 'a' && s.substring(i, i+1) <= 'f') ||
      (s.substring(i, i+1) >= 'A' && s.substring(i, i+1) <= 'F'))) {
        isHex = false;
      }
    }
    return isHex;
  }

  private getHexString(v: number): string {
    if (v < 0 || v > 255) {v = 0; }
    const h: string = v.toString(16);
    return (h.length > 1) ? h : '0' + h;
  }

  // returns 6 digits long hex string without leading #
  private getHexColor(color: string): string {
    const colorNames =  ['AliceBlue','AntiqueWhite','Aqua','Aquamarine','Azure','Beige','Bisque','Black','BlanchedAlmond','Blue','BlueViolet','Brown','BurlyWood','CadetBlue','Chartreuse','Chocolate','Coral','CornflowerBlue','Cornsilk','Crimson','Cyan','DarkBlue','DarkCyan','DarkGoldenRod','DarkGray','DarkGrey','DarkGreen','DarkKhaki','DarkMagenta','DarkOliveGreen','DarkOrange','DarkOrchid','DarkRed','DarkSalmon','DarkSeaGreen','DarkSlateBlue','DarkSlateGray','DarkSlateGrey','DarkTurquoise','DarkViolet','DeepPink','DeepSkyBlue','DimGray','DimGrey','DodgerBlue','FireBrick','FloralWhite','ForestGreen','Fuchsia','Gainsboro','GhostWhite','Gold','GoldenRod','Gray','Grey','Green','GreenYellow','HoneyDew','HotPink','IndianRed','Indigo','Ivory','Khaki','Lavender','LavenderBlush','LawnGreen','LemonChiffon','LightBlue','LightCoral','LightCyan','LightGoldenRodYellow','LightGray','LightGrey','LightGreen','LightPink','LightSalmon','LightSeaGreen','LightSkyBlue','LightSlateGray','LightSlateGrey','LightSteelBlue','LightYellow','Lime','LimeGreen','Linen','Magenta','Maroon','MediumAquaMarine','MediumBlue','MediumOrchid','MediumPurple','MediumSeaGreen','MediumSlateBlue','MediumSpringGreen','MediumTurquoise','MediumVioletRed','MidnightBlue','MintCream','MistyRose','Moccasin','NavajoWhite','Navy','OldLace','Olive','OliveDrab','Orange','OrangeRed','Orchid','PaleGoldenRod','PaleGreen','PaleTurquoise','PaleVioletRed','PapayaWhip','PeachPuff','Peru','Pink','Plum','PowderBlue','Purple','RebeccaPurple','Red','RosyBrown','RoyalBlue','SaddleBrown','Salmon','SandyBrown','SeaGreen','SeaShell','Sienna','Silver','SkyBlue','SlateBlue','SlateGray','SlateGrey','Snow','SpringGreen','SteelBlue','Tan','Teal','Thistle','Tomato','Turquoise','Violet','Wheat','White','WhiteSmoke','Yellow','YellowGreen'];
    const hexValues = ['f0f8ff','faebd7','00ffff','7fffd4','f0ffff','f5f5dc','ffe4c4','000000','ffebcd','0000ff','8a2be2','a52a2a','deb887','5f9ea0','7fff00','d2691e','ff7f50','6495ed','fff8dc','dc143c','00ffff','00008b','008b8b','b8860b','a9a9a9','a9a9a9','006400','bdb76b','8b008b','556b2f','ff8c00','9932cc','8b0000','e9967a','8fbc8f','483d8b','2f4f4f','2f4f4f','00ced1','9400d3','ff1493','00bfff','696969','696969','1e90ff','b22222','fffaf0','228b22','ff00ff','dcdcdc','f8f8ff','ffd700','daa520','808080','808080','008000','adff2f','f0fff0','ff69b4','cd5c5c','4b0082','fffff0','f0e68c','e6e6fa','fff0f5','7cfc00','fffacd','add8e6','f08080','e0ffff','fafad2','d3d3d3','d3d3d3','90ee90','ffb6c1','ffa07a','20b2aa','87cefa','778899','778899','b0c4de','ffffe0','00ff00','32cd32','faf0e6','ff00ff','800000','66cdaa','0000cd','ba55d3','9370db','3cb371','7b68ee','00fa9a','48d1cc','c71585','191970','f5fffa','ffe4e1','ffe4b5','ffdead','000080','fdf5e6','808000','6b8e23','ffa500','ff4500','da70d6','eee8aa','98fb98','afeeee','db7093','ffefd5','ffdab9','cd853f','ffc0cb','dda0dd','b0e0e6','800080','663399','ff0000','bc8f8f','4169e1','8b4513','fa8072','f4a460','2e8b57','fff5ee','a0522d','c0c0c0','87ceeb','6a5acd','708090','708090','fffafa','00ff7f','4682b4','d2b48c','008080','d8bfd8','ff6347','40e0d0','ee82ee','f5deb3','ffffff','f5f5f5','ffff00','9acd32']; 
    const index = colorNames.findIndex(_ => _ === color);
    if (index >= 0) {
      return hexValues[index];
    } else {
      return '';
    }
  }

  /*************************** public getters and setters ******************* */

  public getRgb(): string {
    // rgb string as 'rgb(#, #, #)'
    return 'rgb('
    + this.rgbObject.r.toString()
    + ', '
    + this.rgbObject.g.toString()
    + ', '
    + this.rgbObject.b.toString()
    + ')';
  }

  public getHsl(): string {
    // hsl string as 'hsl(#, #, #)'
    return 'hsl('
    + this.hslObject.h.toString()
    + ', '
    + this.hslObject.s.toString()
    + '%, '
    + this.hslObject.l.toString()
    + '%)';
  }

  public getHex(): string {
    // hex string, length = 7, with leading #
    return '#'
    + this.getHexString(this.rgbObject.r)
    + this.getHexString(this.rgbObject.g)
    + this.getHexString(this.rgbObject.b);
  }

  // hue from hsl - value between 0 and 255
  public getHue(): number {
    return this.hslObject.h;
  }

  // saturation from hsl - value between 0 and 255
  public getSaturation(): number {
    return this.hslObject.s;
  }

  // lightnesss from hsl - value between 0 and 255
  public getLightness(): number {
    return this.hslObject.l;
  }

  // perceived lightnesss between 0 and 1 - we use W3C method
  /*
    sRGB Luma (ITU Rec. 709): L = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
    W3C method (working draft): L = (red * 0.299 + green * 0.587 + blue * 0.114) / 255
  */
  public getPerceivedLightness(): number {
    // return ((this.rgbObject.r * 0.2126 + this.rgbObject.g * 0.7152 + this.rgbObject.b * 0.0722) / 255);
    return ((this.rgbObject.r * 0.299 + this.rgbObject.g * 0.587 + this.rgbObject.b * 0.114) / 255);
  }

  /**
   *
   * @param r red  beween 0 and 255
   * @param g green  beween 0 and 255
   * @param b blue beween 0 and 255
   */
  public setRgb (r: number, g: number, b: number) {
    if (r < 0 ) {r = 0; }
    if (r > 255) {r = 255; }
    if (g < 0 ) {g = 0; }
    if (g > 255) {g = 255; }
    if (b < 0 ) {b = 0; }
    if (b > 255) {b = 255; }
    this.rgbObject = {r, g, b};
    this.hslObject = GlobalFunctions.rgbToHsl(this.rgbObject);
  }

  /**
   *
   * @param h hue beween 0 and 360
   * @param s saturation between 0 and 100
   * @param l lightness between 0 and 100
   */
  public setHsl (h: number, s: number, l: number) {
    if (h < 0 ) {h = 0; }
    if (h > 360) {h = 360; }
    if (s < 0 ) {s = 0; }
    if (s > 100) {s = 100; }
    if (l < 0 ) {l = 0; }
    if (l > 100) {l = 100; }
    this.hslObject = {h, s, l};
    this.rgbObject = GlobalFunctions.hslToRgb(this.hslObject);
  }

  public setHue(h: number) {
    this.setHsl(h, this.hslObject.s, this.hslObject.l);
  }

  public setSaturation(s: number) {
    this.setHsl(this.hslObject.h, s, this.hslObject.l);
  }

  public setLightness(l: number) {
    this.setHsl(this.hslObject.h, this.hslObject.s, l);
  }

}
