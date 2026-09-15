rule JockyHarmlessFixture {
    meta:
        description = "Matches the JOCKY DEMO text marker, not malware"
    strings:
        $marker = "JOCKY DEMO"
    condition:
        $marker
}
