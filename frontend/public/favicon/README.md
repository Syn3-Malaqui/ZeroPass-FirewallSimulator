# ZeroPass Favicon Assets

This folder contains all the favicon and icon assets for the ZeroPass Firewall Simulator application.

## 📁 File Structure

### Core Favicon Files
- `favicon.ico` - Classic ICO format favicon (16x16, 32x32, 48x48)
- `favicon.svg` - Modern SVG favicon (scalable, perfect for modern browsers)
- `favicon-16x16.png` - 16x16 PNG favicon
- `favicon-32x32.png` - 32x32 PNG favicon

### Apple/iOS Icons
- `apple-touch-icon.png` - 180x180 Apple touch icon for iOS Safari
- `apple-touch-icon-precomposed.png` - Pre-composed version (no iOS effects)

### Android/Chrome Icons
- `android-chrome-192x192.png` - 192x192 Android Chrome icon
- `android-chrome-512x512.png` - 512x512 Android Chrome icon (PWA)

### Windows/Microsoft Icons
- `mstile-150x150.png` - 150x150 Microsoft tile icon for Windows

### PWA Manifest
- `site.webmanifest` - Progressive Web App manifest file
- `browserconfig.xml` - Microsoft browser configuration

## 🎨 Design Specifications

### Brand Colors
- **Primary Blue**: `#3B82F6` (blue-500)
- **Secondary Blue**: `#1D4ED8` (blue-700)
- **Accent Blue**: `#60A5FA` (blue-400)
- **Background**: `#FFFFFF` (white)

### Icon Design
- **Shield Symbol**: Represents security and protection
- **Lock Element**: Indicates firewall/security functionality
- **Gradient Background**: Modern, professional appearance
- **High Contrast**: Ensures visibility across all platforms

## 🔧 Usage Instructions

### Next.js Integration
Add these lines to your `app/layout.tsx` or `pages/_document.tsx`:

```html
<!-- Favicon -->
<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />

<!-- PWA Manifest -->
<link rel="manifest" href="/favicon/site.webmanifest" />

<!-- Microsoft/Windows -->
<meta name="msapplication-config" content="/favicon/browserconfig.xml" />
<meta name="theme-color" content="#2563eb" />
```

### File Size Guidelines
- ICO files: < 100KB
- PNG files: < 50KB each
- SVG files: < 10KB
- Total folder size: < 500KB

## 🛠️ Generating Additional Sizes

If you need to generate additional favicon sizes, you can:

1. **Use the SVG as source**: Scale `favicon.svg` to any required size
2. **Online tools**: Use favicon generators like RealFaviconGenerator.net
3. **Command line**: Use ImageMagick or similar tools

### Example ImageMagick Commands
```bash
# Generate from SVG
convert favicon.svg -resize 16x16 favicon-16x16.png
convert favicon.svg -resize 32x32 favicon-32x32.png
convert favicon.svg -resize 180x180 apple-touch-icon.png

# Create ICO from PNGs
convert favicon-16x16.png favicon-32x32.png favicon.ico
```

## 📱 Platform Support

- ✅ **Chrome/Chromium** - All sizes supported
- ✅ **Firefox** - SVG and ICO support
- ✅ **Safari** - Apple touch icons
- ✅ **Edge** - All Windows formats
- ✅ **iOS Safari** - Apple touch icons
- ✅ **Android Chrome** - PWA manifest icons
- ✅ **Windows Tiles** - Microsoft tile format

## 🔄 Update Checklist

When updating favicons:

1. [ ] Update `favicon.svg` with new design
2. [ ] Regenerate all PNG sizes from SVG
3. [ ] Update colors in `site.webmanifest`
4. [ ] Update colors in `browserconfig.xml`
5. [ ] Test on multiple browsers/devices
6. [ ] Clear browser cache for testing

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Designer**: ZeroPass Team 