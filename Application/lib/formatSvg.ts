// Function to convert DiceBear SVG string to React Native SVG components
export const formatSvg = (svg: string) => {
  // Extract background color from the rect fill attribute (more specific pattern)
  const bgColorMatch = svg.match(/<rect[^>]*fill="([^"]*)"[^>]*width="100"[^>]*height="100"/);
  const backgroundColor = bgColorMatch ? bgColorMatch[1] : '#10b981';
  
  // Extract text content from the text element
  const textMatch = svg.match(/<text[^>]*>([^<]*)<\/text>/);
  const text = textMatch ? textMatch[1] : 'U';
  
  // Extract text color from the text fill attribute (more specific pattern)
  const textColorMatch = svg.match(/<text[^>]*fill="([^"]*)"[^>]*>/);
  const textColor = textColorMatch ? textColorMatch[1] : '#000000';
  
  // Extract font size from the text font-size attribute
  const fontSizeMatch = svg.match(/font-size="([^"]*)"/);
  const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 50;
  
  // Extract font family from the text font-family attribute
  const fontFamilyMatch = svg.match(/font-family="([^"]*)"/);
  const fontFamily = fontFamilyMatch ? fontFamilyMatch[1] : 'Arial, sans-serif';
  
  // Extract font weight from the text font-weight attribute
  const fontWeightMatch = svg.match(/font-weight="([^"]*)"/);
  const fontWeight = fontWeightMatch ? fontWeightMatch[1] : '400';
  
  // Extract text positioning - more specific patterns
  const xMatch = svg.match(/<text[^>]*x="([^"]*)"[^>]*>/);
  const yMatch = svg.match(/<text[^>]*y="([^"]*)"[^>]*>/);
  
  let x = '50';
  let y = '65';
  
  if (xMatch) {
    const xValue = xMatch[1];
    x = xValue === '50%' ? '50' : xValue;
  }
  
  if (yMatch) {
    const yValue = yMatch[1];
    y = yValue === '50%' ? '65' : yValue;
  }
  
  // Extract text anchor
  const textAnchorMatch = svg.match(/text-anchor="([^"]*)"/);
  const textAnchor = textAnchorMatch ? textAnchorMatch[1] as 'start' | 'middle' | 'end' : 'middle';
  
  const result = {
    backgroundColor,
    text,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    x,
    y,
    textAnchor: textAnchor as 'start' | 'middle' | 'end'
  };
  return result;
};

// Function to generate React Native SVG JSX from formatted SVG data
export const generateSvgJsx = (svgData: ReturnType<typeof formatSvg>) => {
  return {
    backgroundColor: svgData.backgroundColor,
    text: svgData.text,
    textColor: svgData.textColor,
    fontSize: svgData.fontSize,
    fontFamily: svgData.fontFamily,
    fontWeight: svgData.fontWeight,
    x: svgData.x,
    y: svgData.y,
    textAnchor: svgData.textAnchor
  };
};