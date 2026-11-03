# Labeling spec <Badge type="warning" text="draft" />

The switch dataset has to let a model answer three questions from an image: **where** the control is, **how** to operate it, and **what** it turns on. One JSON record per image holds a list of controls.

::: tip Rules
- Write `null` for anything you do not know. Never guess a value.
- A plate with several switches gets one entry per switch, ordered by `gang_index` from 0.
- Mask people before upload and always fill `consent` (rule C-05).
:::

## Record

```json
{
  "image_id": "img_000123",
  "room": "living",
  "session": "s01",
  "consent": "c007",
  "capture": { "distance_m": 1.6, "view_angle_deg": 20, "lighting": "dim" },
  "controls": [
    {
      "kind": "switch",
      "decoy": false,
      "plate_bbox": [0.62, 0.30, 0.10, 0.22],
      "bbox": [0.64, 0.33, 0.03, 0.07],
      "gang_index": 0,
      "gang_count": 2,
      "occluded": false,
      "height_m": 1.2,
      "operation": "rocker",
      "press_point": [0.655, 0.365],
      "press_side": "lower",
      "reachable": true,
      "state": "off",
      "context": {
        "room_type": "living_room",
        "label_text": null,
        "icon": "bulb",
        "wall_position": "beside_door",
        "near_door": true,
        "near_bed": false,
        "nearby_objects": ["sofa", "floor_lamp"],
        "nearby_devices": ["ceiling_light", "floor_lamp", "outlet"]
      },
      "evidence": {
        "before_image": "img_000123",
        "after_image": "img_000124",
        "changed_device": "ceiling_light",
        "change": "off_to_on"
      },
      "role": {
        "device_id": "dev_living_ceiling_01",
        "device_type": "light",
        "scope": "main",
        "effect": "toggle",
        "wireless_alt": false,
        "confidence": "certain"
      }
    }
  ],
  "status": "reviewed"
}
```

## Fields

### Image

| Field | Meaning |
|---|---|
| `image_id`, `consent` | Image id and the consent record behind it |
| `room`, `session` | Used to split train and evaluation sets: one room or session never appears in both |
| `capture.distance_m`, `view_angle_deg`, `lighting` | Shooting conditions, to see where recognition works and where it fails |
| `status` | `draft`, `reviewed` or `frozen` |

### Where

| Field | Meaning |
|---|---|
| `plate_bbox` | The whole switch plate, `[x, y, w, h]` as ratios 0 to 1 of the image |
| `bbox` | The part that moves |
| `gang_index`, `gang_count` | Position on a multi-switch plate and the number of switches on it |
| `height_m` | Height from the floor |
| `occluded`, `decoy` | Partly hidden; looks like a control but is not one (thermostat, outlet) |

### How

| Field | Meaning |
|---|---|
| `kind` | `switch`, `button`, `dial`, `remote` |
| `operation` | `rocker`, `push`, `dial` |
| `press_point` | The point to press, as ratios 0 to 1 of the image |
| `press_side` | `upper` or `lower` for a rocker, `cw` or `ccw` for a dial |
| `reachable` | Whether the robot arm can reach it |
| `state` | `on`, `off`, `unknown` |

### What it controls

| Group | Field | Why |
|---|---|---|
| Clue: room | `room_type` | Each room type has typical devices |
| Clue: plate | `label_text`, `icon` | Text or a symbol on the plate (bulb, fan) |
| Clue: position | `wall_position`, `near_door`, `near_bed` | A switch beside the door usually runs the ceiling light |
| Clue: surroundings | `nearby_objects`, `nearby_devices` | Visible lights, fans and outlets narrow the candidates |
| Evidence | `before_image`, `after_image`, `changed_device`, `change` | A photo pair before and after a press. The strongest evidence, and the basis of the role label |
| Answer | `device_id`, `device_type`, `scope`, `effect`, `wireless_alt`, `confidence` | The device and type (`light`, `fan`, `heater`, `outlet`), scope (`main`, `accent`, `all`), effect (`toggle`, `on`, `off`), whether it also has a wireless channel, and how sure the label is (`certain`, `likely`, `guess`) |

::: warning Evidence is not a model input
`evidence` reveals the answer. Use it only to check labels, never as an input when training. Model inputs are the image and `context`.
:::

## Open items

- The label schema in the harness standard (`per-repo.md`) is one line per control. It has to be updated to this record before collection starts.
- Without a depth camera, `height_m` is measured by hand or left `null`.
