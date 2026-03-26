const Jimp = require('jimp');

async function processImage() {
    const imagePath = 'public/logo1.jpg';
    const outputPath = 'public/logo1.png'; // Will become transparent PNG

    try {
        const image = await Jimp.read(imagePath);
        console.log(`Loaded ${image.getWidth()}x${image.getHeight()}`);

        // The image has a white rectangular background. Let's find the circle center!
        const centerX = image.getWidth() / 2;
        const centerY = image.getHeight() / 2;
        // Assuming the logo is roughly touching the shorter edge (Height)
        const radius = Math.min(centerX, centerY) * 0.98; // 98% to cut slightly inside to avoid white fringe
        console.log(`Center: ${centerX}, ${centerY}, Radius: ${radius}`);

        // Loop through all pixels. If distance from center > radius, make it transparent!
        // Also, if a pixel is near white AND outside the immediate center, we might also fade it.
        // But perfect circle cutout is usually what "make the cut out of logo" means!
        image.scan(0, 0, image.getWidth(), image.getHeight(), function (x, y, idx) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            // If outside the circle, transparent
            if (distance > radius) {
                this.bitmap.data[idx + 3] = 0; // Alpha
            } else {
                // Soft edge for anti-aliasing
                if (distance > radius - 2) {
                    this.bitmap.data[idx + 3] = 128;
                } else {
                    // Also, inside the circle, let's remove pure white if it exists strongly as a background?
                    // The prompt just says "remove the white background" - often the white corners ARE the background!
                }
            }
        });

        // We should also automatically crop the image to the bounding box of the non-transparent pixels!
        const cropSize = radius * 2;
        const startX = centerX - radius;
        const startY = centerY - radius;

        image.crop(Math.max(0, startX), Math.max(0, startY), Math.min(image.getWidth(), cropSize), Math.min(image.getHeight(), cropSize));

        await image.writeAsync(outputPath);
        console.log(`Saved transparent logo as ${outputPath}`);
    } catch (err) {
        console.error(err);
    }
}

processImage();
