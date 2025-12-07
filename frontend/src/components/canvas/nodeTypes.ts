/**
 * Node Types Configuration for React Flow
 */

import { NodeTypes } from 'reactflow';
import { CustomNode } from './CustomNode';
import { CompositeNode } from './CompositeNode';
import { ForLoopNode } from './ForLoopNode';
import { WhileLoopNode } from './WhileLoopNode';

export const nodeTypes: NodeTypes = {
  functionNode: CustomNode,
  compositeNode: CompositeNode,
  forLoopNode: ForLoopNode,
  whileLoopNode: WhileLoopNode,
  // Add more node types here as needed
  // variableNode: VariableNode,
  // commentNode: CommentNode,
};
