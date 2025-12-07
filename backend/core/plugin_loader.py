"""Plugin loader for dynamic plugin discovery and loading."""

import importlib.util
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml

logger = logging.getLogger(__name__)


class PluginLoader:
    """
    Dynamic plugin loader for device plugins.

    Discovers and loads plugins from the plugin directory.
    Each plugin is a folder containing:
    - config.yaml: Plugin metadata and function definitions
    - device.py: Device class implementation
    - functions.py: Function class implementations
    """

    def __init__(self, plugin_dir: str = "plugins"):
        """
        Initialize plugin loader.

        Args:
            plugin_dir: Directory containing plugins
        """
        self.plugin_dir = Path(plugin_dir)
        self.plugins: Dict[str, Dict[str, Any]] = {}
        self.loaded_modules: Dict[str, Any] = {}

        # Create plugin directory if it doesn't exist
        self.plugin_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"PluginLoader initialized with directory: {self.plugin_dir}")

    async def discover_plugins(self) -> List[Dict[str, Any]]:
        """
        Discover all available plugins.

        Returns:
            List of plugin information dictionaries
        """
        discovered_plugins = []

        if not self.plugin_dir.exists():
            logger.warning(f"Plugin directory does not exist: {self.plugin_dir}")
            return discovered_plugins

        for plugin_path in self.plugin_dir.iterdir():
            # Skip non-directories and private folders
            if not plugin_path.is_dir() or plugin_path.name.startswith('_'):
                continue

            # Check if valid plugin
            if not self._validate_plugin(plugin_path):
                continue

            try:
                config = self._load_plugin_config(plugin_path)
                if config:
                    plugin_info = self._extract_plugin_info(config, plugin_path.name)
                    discovered_plugins.append(plugin_info)
                    self.plugins[plugin_path.name] = {
                        "config": config,
                        "path": plugin_path
                    }
                    logger.info(f"Discovered plugin: {plugin_path.name}")
            except Exception as e:
                logger.error(f"Error discovering plugin {plugin_path.name}: {e}")

        logger.info(f"Discovered {len(discovered_plugins)} plugins")
        return discovered_plugins

    def _validate_plugin(self, plugin_path: Path) -> bool:
        """
        Validate plugin structure.

        Args:
            plugin_path: Path to plugin directory

        Returns:
            True if plugin is valid
        """
        required_files = ["config.yaml", "device.py", "functions.py"]

        for file_name in required_files:
            if not (plugin_path / file_name).exists():
                logger.warning(f"Plugin {plugin_path.name} missing {file_name}")
                return False

        return True

    def _load_plugin_config(self, plugin_path: Path) -> Optional[Dict[str, Any]]:
        """
        Load plugin configuration from config.yaml.

        Args:
            plugin_path: Path to plugin directory

        Returns:
            Plugin configuration dictionary or None if failed
        """
        config_file = plugin_path / "config.yaml"

        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
                return config
        except Exception as e:
            logger.error(f"Error loading config for {plugin_path.name}: {e}")
            return None

    def _extract_plugin_info(self, config: Dict[str, Any], plugin_id: str) -> Dict[str, Any]:
        """
        Extract plugin information for API response.

        Args:
            config: Plugin configuration
            plugin_id: Plugin identifier

        Returns:
            Plugin information dictionary
        """
        plugin_meta = config.get("plugin", {})
        device_meta = config.get("device", {})
        functions_meta = config.get("functions", [])

        return {
            "id": plugin_id,
            "name": plugin_meta.get("name", plugin_id),
            "version": plugin_meta.get("version", "1.0.0"),
            "author": plugin_meta.get("author", "Unknown"),
            "description": plugin_meta.get("description", ""),
            "category": plugin_meta.get("category", "General"),
            "color": plugin_meta.get("color", "#888888"),
            "device_class": device_meta.get("class", ""),
            "connection_types": device_meta.get("connection_types", []),
            "functions": functions_meta
        }

    async def load_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """
        Load a specific plugin's classes.

        Args:
            plugin_id: Plugin identifier

        Returns:
            Dictionary with loaded device and function classes

        Raises:
            ValueError: If plugin not found or loading fails
        """
        if plugin_id not in self.plugins:
            raise ValueError(f"Plugin '{plugin_id}' not found")

        plugin_info = self.plugins[plugin_id]
        plugin_path = plugin_info["path"]
        config = plugin_info["config"]

        try:
            # Load device module
            device_module = self._load_module(plugin_path / "device.py", f"{plugin_id}.device")
            device_class_name = config["device"]["class"]
            device_class = getattr(device_module, device_class_name)

            # Load functions module
            functions_module = self._load_module(plugin_path / "functions.py", f"{plugin_id}.functions")

            # Load function classes
            function_classes = {}
            for func_def in config.get("functions", []):
                func_id = func_def["id"]
                func_class_name = self._to_class_name(func_id)

                if hasattr(functions_module, func_class_name):
                    function_classes[func_id] = getattr(functions_module, func_class_name)
                else:
                    logger.warning(f"Function class '{func_class_name}' not found in {plugin_id}")

            self.loaded_modules[plugin_id] = {
                "device_class": device_class,
                "function_classes": function_classes,
                "config": config
            }

            logger.info(f"Loaded plugin: {plugin_id} with {len(function_classes)} functions")

            return self.loaded_modules[plugin_id]

        except Exception as e:
            logger.error(f"Error loading plugin {plugin_id}: {e}")
            raise ValueError(f"Failed to load plugin '{plugin_id}': {str(e)}")

    def _load_module(self, module_path: Path, module_name: str):
        """
        Dynamically load a Python module.

        Args:
            module_path: Path to the module file
            module_name: Name for the module

        Returns:
            Loaded module
        """
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load module from {module_path}")

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def _to_class_name(self, func_id: str) -> str:
        """
        Convert function ID to class name.

        Examples:
            "move_absolute" -> "MoveAbsoluteFunction"
            "read_value" -> "ReadValueFunction"
            "home" -> "HomeFunction"

        Args:
            func_id: Function identifier (snake_case)

        Returns:
            Class name (PascalCase + "Function")
        """
        # Split by underscore and capitalize each word
        words = func_id.split('_')
        class_name = ''.join(word.capitalize() for word in words)
        return f"{class_name}Function"

    def get_plugin_config(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """
        Get plugin configuration.

        Args:
            plugin_id: Plugin identifier

        Returns:
            Plugin configuration or None if not found
        """
        if plugin_id in self.plugins:
            return self.plugins[plugin_id]["config"]
        return None

    def get_loaded_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """
        Get loaded plugin modules.

        Args:
            plugin_id: Plugin identifier

        Returns:
            Loaded plugin data or None if not loaded
        """
        return self.loaded_modules.get(plugin_id)

    async def reload_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """
        Reload a plugin (for hot reload).

        Args:
            plugin_id: Plugin identifier

        Returns:
            Reloaded plugin data
        """
        if plugin_id in self.loaded_modules:
            del self.loaded_modules[plugin_id]

        return await self.load_plugin(plugin_id)

    def unload_plugin(self, plugin_id: str) -> bool:
        """
        Unload a plugin.

        Args:
            plugin_id: Plugin identifier

        Returns:
            True if unloaded successfully
        """
        if plugin_id in self.loaded_modules:
            del self.loaded_modules[plugin_id]
            logger.info(f"Unloaded plugin: {plugin_id}")
            return True
        return False
