local Config = {}

Config.GameName = "Tidebreakers: Eclipse Sea"
Config.MaxLevel = 100
Config.StartingStats = {
    Level = 1,
    XP = 0,
    Shells = 0,
    Energy = 100,
}

Config.Abilities = {
    Emberwake = {
        KeyCode = Enum.KeyCode.Q,
        Cooldown = 2.5,
        EnergyCost = 15,
        Range = 55,
        Damage = 28,
        Color = Color3.fromRGB(255, 106, 45),
        Label = "Emberwake",
        Description = "Launch a focused wave of heated sea-fire.",
    },
    RiftCurrent = {
        KeyCode = Enum.KeyCode.E,
        Cooldown = 6,
        EnergyCost = 25,
        Range = 18,
        Damage = 20,
        Color = Color3.fromRGB(62, 188, 255),
        Label = "Rift Current",
        Description = "Pull nearby enemies into a crushing current.",
    },
    Stonebloom = {
        KeyCode = Enum.KeyCode.R,
        Cooldown = 9,
        EnergyCost = 35,
        Range = 24,
        Damage = 42,
        Color = Color3.fromRGB(173, 116, 255),
        Label = "Stonebloom",
        Description = "Raise a short-lived crystal shockwave.",
    },
}

Config.Enemy = {
    Name = "Training Raider",
    MaxHealth = 120,
    XP = 35,
    Shells = 18,
}

return Config
