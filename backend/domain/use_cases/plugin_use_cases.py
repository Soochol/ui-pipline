"""Plugin-related use cases."""

from typing import List, Dict, Any


class ListPluginsUseCase:
    """Use case for listing available plugins."""

    def __init__(self, plugin_loader):
        self.plugin_loader = plugin_loader

    async def execute(self) -> List[Dict[str, Any]]:
        """
        List all available plugins.

        Returns:
            List of plugin information dictionaries
        """
        if self.plugin_loader is None:
            return []

        plugins = await self.plugin_loader.discover_plugins()
        return plugins
