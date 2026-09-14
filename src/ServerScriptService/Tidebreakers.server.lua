local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.GameConfig)

local remotes = ReplicatedStorage:FindFirstChild("TidebreakersRemotes") or Instance.new("Folder")
remotes.Name = "TidebreakersRemotes"
remotes.Parent = ReplicatedStorage

local abilityRequest = remotes:FindFirstChild("AbilityRequest") or Instance.new("RemoteEvent")
abilityRequest.Name = "AbilityRequest"
abilityRequest.Parent = remotes

local fxEvent = remotes:FindFirstChild("AbilityFX") or Instance.new("RemoteEvent")
fxEvent.Name = "AbilityFX"
fxEvent.Parent = remotes

local cooldowns = {}

local function getStats(player)
    return player:FindFirstChild("TideStats")
end

local function setupPlayer(player)
    local stats = Instance.new("Folder")
    stats.Name = "TideStats"
    stats.Parent = player

    for name, value in pairs(Config.StartingStats) do
        local valueObject = Instance.new(name == "Energy" and "NumberValue" or "IntValue")
        valueObject.Name = name
        valueObject.Value = value
        valueObject.Parent = stats
    end

    cooldowns[player] = {}

    task.spawn(function()
        while player.Parent do
            task.wait(1)
            local energy = stats:FindFirstChild("Energy")
            if energy then
                energy.Value = math.min(100, energy.Value + 8)
            end
        end
    end)
end

local function awardEnemy(player, enemy)
    if enemy:GetAttribute("Rewarded") then
        return
    end

    enemy:SetAttribute("Rewarded", true)
    local stats = getStats(player)
    if not stats then
        return
    end

    local xp = stats.XP
    local level = stats.Level
    local shells = stats.Shells
    xp.Value += Config.Enemy.XP
    shells.Value += Config.Enemy.Shells

    while level.Value < Config.MaxLevel and xp.Value >= level.Value * 100 do
        xp.Value -= level.Value * 100
        level.Value += 1
        fxEvent:FireClient(player, {
            Name = "LevelUp",
            Level = level.Value,
        })
    end
end

local function findTargets(character, center, direction, size)
    local params = OverlapParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = { character }
    params.MaxParts = 100

    local boxCFrame = CFrame.lookAt(center, center + direction)
    local parts = Workspace:GetPartBoundsInBox(boxCFrame, size, params)
    local targets = {}
    local seen = {}

    for _, part in ipairs(parts) do
        local model = part:FindFirstAncestorOfClass("Model")
        local humanoid = model and model:FindFirstChildOfClass("Humanoid")
        if model and humanoid and humanoid.Health > 0 and model:GetAttribute("TideEnemy") and not seen[model] then
            seen[model] = true
            table.insert(targets, { Model = model, Humanoid = humanoid })
        end
    end

    return targets
end

local function useAbility(player, powerName)
    if typeof(powerName) ~= "string" then
        return
    end

    local ability = Config.Abilities[powerName]
    if not ability then
        return
    end

    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    local stats = getStats(player)
    if not root or not humanoid or humanoid.Health <= 0 or not stats then
        return
    end

    cooldowns[player] = cooldowns[player] or {}
    local now = os.clock()
    if cooldowns[player][powerName] and cooldowns[player][powerName] > now then
        return
    end

    local energy = stats.Energy
    if energy.Value < ability.EnergyCost then
        return
    end

    cooldowns[player][powerName] = now + ability.Cooldown
    energy.Value -= ability.EnergyCost

    local direction = root.CFrame.LookVector
    local center = root.Position
    local size

    if powerName == "Emberwake" then
        center = root.Position + direction * (ability.Range * 0.5)
        size = Vector3.new(10, 10, ability.Range)
    elseif powerName == "RiftCurrent" then
        size = Vector3.new(ability.Range * 2, 12, ability.Range * 2)
    else
        size = Vector3.new(ability.Range * 2, 10, ability.Range * 2)
    end

    local targets = findTargets(character, center, direction, size)
    for _, target in ipairs(targets) do
        local targetRoot = target.Model:FindFirstChild("HumanoidRootPart")
        target.Model:SetAttribute("LastAttackerUserId", player.UserId)
        if target.Humanoid.Health <= ability.Damage then
            awardEnemy(player, target.Model)
        end
        target.Humanoid:TakeDamage(ability.Damage)

        if targetRoot then
            local pushDirection = (targetRoot.Position - root.Position).Unit
            if powerName == "Emberwake" then
                pushDirection = direction
            end
            targetRoot.AssemblyLinearVelocity = pushDirection * (powerName == "Stonebloom" and 70 or 42) + Vector3.new(0, 18, 0)
        end
    end

    fxEvent:FireAllClients({
        Name = powerName,
        Origin = root.Position,
        Direction = direction,
        Color = ability.Color,
        Radius = ability.Range,
    })
end

Players.PlayerAdded:Connect(setupPlayer)
Players.PlayerRemoving:Connect(function(player)
    cooldowns[player] = nil
end)

for _, player in ipairs(Players:GetPlayers()) do
    task.spawn(setupPlayer, player)
end

abilityRequest.OnServerEvent:Connect(useAbility)
