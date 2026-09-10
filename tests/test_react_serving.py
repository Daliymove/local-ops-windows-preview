import unittest
import server
from tests.test_hardening import HttpHarness

class ReactServingTests(unittest.TestCase):
    def setUp(self):
        self.h = HttpHarness()

    def tearDown(self):
        self.h.close()

    def test_serves_react_dist_index(self):
        status, body, headers = self.h.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("Content-Type", ""))
        self.assertIn(b'id="root"', body)

    def test_serves_react_assets(self):
        status, body, headers = self.h.request("GET", "/")
        self.assertEqual(status, 200)
        text = body.decode("utf-8")
        import re
        m = re.search(r'src="(/assets/index-[^"]+\.js)"', text)
        self.assertIsNotNone(m, "JS bundle not found in index.html")
        js_path = m.group(1)
        js_status, js_body, js_headers = self.h.request("GET", js_path)
        self.assertEqual(js_status, 200)
        self.assertIn("javascript", js_headers.get("Content-Type", ""))
        self.assertGreater(len(js_body), 1000)

if __name__ == "__main__":
    unittest.main()
