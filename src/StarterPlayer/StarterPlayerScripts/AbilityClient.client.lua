local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local player = Players.LocalPlayer
local Config = require(ReplicatedStorage.Shared.GameConfig)
local remotes = ReplicatedStorage:WaitForChild("TidebreakersRemotes")
local abilityRequest = remotes:WaitForChild("AbilityRequest")
local fxEvent = remotes:WaitForChild("AbilityFX")

local gui = Instance.new("ScreenGui")
gui.Name = "TidebreakersHUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = player:WaitForChild("PlayerGui")

local panel = Instance.new("Frame")
panel.Name = "AbilityPanel"
panel.AnchorPoint = Vector2.new(0, 1)
panel.Position = UDim2.fromScale(0.03, 0.96)
panel.Size = UDim2.fromScale(0.28, 0.28)
panel.BackgroundColor3 = Color3.fromRGB(12, 18, 29)
panel.BackgroundTransparency = 0.12
panel.BorderSizePixel = 0
panel.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(104, 168, 203)
stroke.Transparency = 0.45
stroke.Thickness = 1
stroke.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromScale(0.06, 0.06)
title.Size = UDim2.fromScale(0.88, 0.12)
title.Font = Enum.Font.GothamBold
title.Text = Config.GameName
title.TextColor3 = Color3.fromRGB(235, 245, 255)
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = panel

local statsLabel = Instance.new("TextLabel")
statsLabel.BackgroundTransparency = 1
statsLabel.Position = UDim2.fromScale(0.06, 0.2)
statsLabel.Size = UDim2.fromScale(0.88, 0.12)
statsLabel.Font = Enum.Font.Gotham
statsLabel.TextColor3 = Color3.fromRGB(164, 217, 240)
statsLabel.TextScaled = true
statsLabel.TextXAlignment = Enum.TextXAlignment.Left
statsLabel.Parent = panel

local abilitiesFrame = Instance.new("Frame")
abilitiesFrame.BackgroundTransparency = 1
abilitiesFrame.Position = UDim2.fromScale(0.06, 0.35)
abilitiesFrame.Size = UDim2.fromScale(0.88, 0.51)
abilitiesFrame.Parent = panel

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 5)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = abilitiesFrame

local notice = Instance.new("TextLabel")
notice.BackgroundTransparency = 1
notice.AnchorPoint = Vector2.new(0.5, 0)
notice.Position = UDim2.fromScale(0.5, 0.08)
notice.Size = UDim2.fromScale(0.7, 0.06)
notice.Font = Enum.Font.GothamBold
notice.TextColor3 = Color3.fromRGB(255, 224, 137)
notice.TextScaled = true
notice.TextTransparency = 1
notice.Parent = gui

local buttons = {}
local cooldownUntil = {}

local function showNotice(text, color)
    notice.Text = text
    notice.TextColor3 = color or Color3.fromRGB(255, 224, 137)
    notice.TextTransparency = 0
    task.delay(1.6, function()
        TweenService:Create(notice, TweenInfo.new(0.35), { TextTransparency = 1 }):Play()
    end)
end

local function getStat(name)
    local stats = player:FindFirstChild("TideStats")
    return stats and stats:FindFirstChild(name)
end

local function updateStats()
    local level = getStat("Level")
    local xp = getStat("XP")
    local shells = getStat("Shells")
    local energy = getStat("Energy")
    if level and xp and shells and energy then
        statsLabel.Text = string.format("LV %d   XP %d   Shells %d   Energy %d/100", level.Value, xp.Value, shells.Value, math.floor(energy.Value))
    end
end

local function trigger(powerName)
    local ability = Config.Abilities[powerName]
    if not ability then
        return
    end
    if cooldownUntil[powerName] and cooldownUntil[powerName] > os.clock() then
        return
    end

    cooldownUntil[powerName] = os.clock() + ability.Cooldown
    abilityRequest:FireServer(powerName)

    task.spawn(function()
        while cooldownUntil[powerName] and cooldownUntil[powerName] > os.clock() do
            local remaining = cooldownUntil[powerName] - os.clock()
            buttons[powerName].Text = string.format("[%s] %s  %.1fs", ability.KeyCode.Name, ability.Label, remaining)
            task.wait(0.08)
        end
        buttons[powerName].Text = string.format("[%s] %s", ability.KeyCode.Name, ability.Label)
    end)
end

for order, powerName in ipairs({ "Emberwake", "RiftCurrent", "Stonebloom" }) do
    local ability = Config.Abilities[powerName]
    local button = Instance.new("TextButton")
    button.Name = powerName
    button.LayoutOrder = order
    button.Size = UDim2.new(1, 0, 0, 32)
    button.BackgroundColor3 = ability.Color
    button.BackgroundTransparency = 0.28
    button.BorderSizePixel = 0
    button.Font = Enum.Font.GothamSemibold
    button.Text = string.format("[%s] %s", ability.KeyCode.Name, ability.Label)
    button.TextColor3 = Color3.fromRGB(255, 255, 255)
    button.TextScaled = true
    button.AutoButtonColor = true
    button.Parent = abilitiesFrame

    local buttonCorner = Instance.new("UICorner")
    buttonCorner.CornerRadius = UDim.new(0, 8)
    buttonCorner.Parent = button

    button.Activated:Connect(function()
        trigger(powerName)
    end)
    buttons[powerName] = button
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then
        return
    end
    for powerName, ability in pairs(Config.Abilities) do
        if input.KeyCode == ability.KeyCode then
            trigger(powerName)
            break
        end
    end
end)

local stats = player:WaitForChild("TideStats")
for _, valueObject in ipairs(stats:GetChildren()) do
    valueObject.Changed:Connect(updateStats)
end
stats.ChildAdded:Connect(function(valueObject)
    valueObject.Changed:Connect(updateStats)
    updateStats()
end)
updateStats()

local function createEffect(data)
    if data.Name == "LevelUp" then
        showNotice("LEVEL UP  " .. tostring(data.Level), Color3.fromRGB(255, 224, 137))
        return
    end
    if not data.Origin or not data.Color then
        return
    end

    local effect = Instance.new("Part")
    effect.Name = "AbilityFeedback"
    effect.Anchored = true
    effect.CanCollide = false
    effect.CanTouch = false
    effect.Material = Enum.Material.Neon
    effect.Color = data.Color
    effect.Transparency = 0.3

    if data.Name == "Emberwake" then
        local direction = data.Direction or Vector3.new(0, 0, -1)
        local length = math.min(data.Radius or 30, 45)
        effect.Size = Vector3.new(7, 7, length)
        effect.CFrame = CFrame.lookAt(data.Origin + direction * (length * 0.5), data.Origin + direction)
        TweenService:Create(effect, TweenInfo.new(0.32, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
            Size = Vector3.new(11, 11, length + 12),
            Transparency = 1,
        }):Play()
    else
        local radius = data.Radius or 18
        effect.Shape = Enum.PartType.Ball
        effect.Size = Vector3.new(6, 6, 6)
        effect.Position = data.Origin
        TweenService:Create(effect, TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
            Size = Vector3.new(radius * 2, radius * 1.2, radius * 2),
            Transparency = 1,
        }):Play()
    end

    effect.Parent = workspace
    Debris:AddItem(effect, 0.6)
end

fxEvent.OnClientEvent:Connect(createEffect)
