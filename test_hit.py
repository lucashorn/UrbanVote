import re

line = "Hit: 0 1 12 11: Attacker hit Victim in the Left Arm"
m_hit = re.search(r"Hit:\s+\d+\s+\d+\s+\d+\s+\d+:\s+(.+?)\s+hit\s+(.+?)\s+in\s+the\s+(.+)", line)
if m_hit:
    print(m_hit.groups())
