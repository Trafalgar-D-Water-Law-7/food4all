router.post("/confirmPickup", ensureAuthenticated, async (req, res) => {
    try {
        const { foodId } = req.body;
        const userId = req.session.userId;

        if (!foodId) {
            return res.status(400).json({ message: "Food ID is required." });
        }

        // Find the donation
        const food = await Donation.findById(foodId);

        if (!food) {
            return res.status(404).json({ message: "Food not found." });
        }

        // Ensure only the donor can confirm pickup
        if (food.user.toString() !== userId) {
            return res.status(403).json({ message: "Only the donor can confirm this pickup." });
        }

        // Delete the donation after confirmation
        await Donation.findByIdAndDelete(foodId);

        res.json({ success: true, message: "Food pickup confirmed and removed!" });
    } catch (error) {
        console.error("Error confirming pickup:", error);
        res.status(500).json({ message: "Server error while confirming pickup." });
    }
});
