local Workspace = game:GetService("Workspace")
local ServerStorage = game:GetService("ServerStorage")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.GameConfig)
local world = Workspace:FindFirstChild("TidebreakersWorld") or Instance.new("Folder")
world.Name = "TidebreakersWorld"
world.Parent = Workspace

local function makePart(parent, name, size, position, color, material)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.Position = position
    part.Color = color
    part.Material = material
    part.Anchored = true
    part.TopSurface = Enum.SurfaceType.Smooth
    part.BottomSurface = Enum.SurfaceType.Smooth
    part.Parent = parent
    return part
end

local function makeEnemy(position, index)
    local enemy = Instance.new("Model")
    enemy.Name = Config.Enemy.Name .. " " .. index
    enemy:SetAttribute("TideEnemy", true)
    enemy.Parent = world

    local root = makePart(enemy, "HumanoidRootPart", Vector3.new(2, 2, 1), position + Vector3.new(0, 4, 0), Color3.fromRGB(35, 38, 48), Enum.Material.SmoothPlastic)
    root.Transparency = 1
    root.CanCollide = false

    local torso = makePart(enemy, "Torso", Vector3.new(3, 3, 1.5), position + Vector3.new(0, 4, 0), Color3.fromRGB(30, 78, 96), Enum.Material.SmoothPlastic)
    torso.CanCollide = true

    local head = makePart(enemy, "Head", Vector3.new(2, 2, 2), position + Vector3.new(0, 6.5, 0), Color3.fromRGB(232, 187, 143), Enum.Material.SmoothPlastic)
    head.Shape = Enum.PartType.Ball

    local leftArm = makePart(enemy, "LeftArm", Vector3.new(0.8, 2.8, 0.8), position + Vector3.new(-2, 4, 0), Color3.fromRGB(232, 187, 143), Enum.Material.SmoothPlastic)
    local rightArm = makePart(enemy, "RightArm", Vector3.new(0.8, 2.8, 0.8), position + Vector3.new(2, 4, 0), Color3.fromRGB(232, 187, 143), Enum.Material.SmoothPlastic)
    local leftLeg = makePart(enemy, "LeftLeg", Vector3.new(1, 2.5, 1), position + Vector3.new(-0.7, 1.6, 0), Color3.fromRGB(25, 28, 38), Enum.Material.SmoothPlastic)
    local rightLeg = makePart(enemy, "RightLeg", Vector3.new(1, 2.5, 1), position + Vector3.new(0.7, 1.6, 0), Color3.fromRGB(25, 28, 38), Enum.Material.SmoothPlastic)

    for _, part in ipairs({torso, head, leftArm, rightArm, leftLeg, rightLeg}) do
        part.CanCollide = false
    end

    local humanoid = Instance.new("Humanoid")
    humanoid.Name = "Humanoid"
    humanoid.MaxHealth = Config.Enemy.MaxHealth
    humanoid.Health = Config.Enemy.MaxHealth
    humanoid.DisplayName = Config.Enemy.Name
    humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.Subject
    humanoid.WalkSpeed = 0
    humanoid.Parent = enemy

    enemy.PrimaryPart = root
    humanoid.Died:Connect(function()
        task.delay(5, function()
            if enemy.Parent then
                enemy:Destroy()
            end
            makeEnemy(position, index)
        end)
    end)

    local highlight = Instance.new("Highlight")
    highlight.FillColor = Color3.fromRGB(255, 90, 90)
    highlight.FillTransparency = 0.82
    highlight.OutlineColor = Color3.fromRGB(255, 210, 180)
    highlight.Parent = enemy
end

if not world:FindFirstChild("TrainingIsland") then
    makePart(world, "Water", Vector3.new(600, 4, 600), Vector3.new(0, -8, 0), Color3.fromRGB(24, 106, 145), Enum.Material.Water)
    makePart(world, "TrainingIsland", Vector3.new(180, 8, 140), Vector3.new(0, -4, 0), Color3.fromRGB(67, 118, 76), Enum.Material.Grass)
    makePart(world, "CliffFace", Vector3.new(150, 18, 18), Vector3.new(0, -2, -61), Color3.fromRGB(70, 70, 78), Enum.Material.Slate)

    local spawn = Instance.new("SpawnLocation")
    spawn.Name = "CrewSpawn"
    spawn.Size = Vector3.new(8, 1, 8)
    spawn.Position = Vector3.new(0, 1, 42)
    spawn.Anchored = true
    spawn.Neutral = true
    spawn.Color = Color3.fromRGB(255, 211, 95)
    spawn.Material = Enum.Material.Neon
    spawn.Parent = world

    for index, position in ipairs({
        Vector3.new(-38, 0, -20),
        Vector3.new(0, 0, -28),
        Vector3.new(38, 0, -20),
        Vector3.new(-20, 0, 12),
        Vector3.new(22, 0, 10),
    }) do
        makeEnemy(position, index)
    end
end
